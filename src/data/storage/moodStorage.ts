/**
 * @fileoverview AsyncStorage wrapper for mood entries (data layer source of truth)
 * @module data/storage/moodStorage
 *
 * Data is stored as a single JSON object keyed by date for O(1) access.
 * Key: "moodly.entries"
 * Value: Record<string, MoodEntry>
 *
 * Notes:
 * - Session in-memory cache for performance
 * - In-flight coalescing to avoid duplicate reads
 * - Safe parsing + typing guards to prevent corrupted storage crashes
 * - Immutable-on-write to keep state predictable and memoization-friendly
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodEntry, MoodEntriesRecord, MoodGrade } from '../../types';
import { logger } from '../../lib/security/logger';
import { isValidISODateKey, normalizeNote, validateEntriesRecord, VALID_MOOD_SET, MAX_NOTE_LEN } from '../model/entry';

const STORAGE_KEY = 'moodly.entries';
const CORRUPT_PREFIX = `${STORAGE_KEY}.corrupt.`;

// In-memory cache for the session (performance-only; does not change semantics).
let entriesCache: MoodEntriesRecord | null = null;
let entriesLoadPromise: Promise<MoodEntriesRecord> | null = null;

// Derived cache: entries grouped by YYYY-MM (used by CalendarScreen to avoid regrouping).
export type EntriesByMonthKey = Record<string, MoodEntriesRecord>;
let entriesByMonthCache: EntriesByMonthKey | null = null;

// Derived cache: sorted list for JournalScreen (newest first).
let entriesSortedDescCache: MoodEntry[] | null = null;

// Derived cache: counts per mood grade (used by Settings; avoids repeated scans).
export type MoodCounts = Record<MoodGrade, number>;
let moodCountsCache: MoodCounts | null = null;

// Derived cache: date keys per month (YYYY-MM -> [YYYY-MM-DD...]) (fast lookups, RAM-heavy).
export type MonthDateKeysIndex = Record<string, string[]>;
let monthDateKeysIndexCache: MonthDateKeysIndex | null = null;

// Derived cache: year/month distribution index for fast "year view" work.
// Structure: year -> monthIndex0 (0..11) -> counts
export type YearIndex = Record<number, Record<number, { total: number; counts: MoodCounts }>>;
let yearIndexCache: YearIndex | null = null;

// Tiny metadata cache (for dev diagnostics + fast stats).
let entriesCountCache: number | null = null;
let lastAllEntriesSource: import('../../lib/security/logger').PerfSource = 'storage';

export function getLastAllEntriesSource(): import('../../lib/security/logger').PerfSource {
  return lastAllEntriesSource;
}

function monthKeyFromIso(isoDate: string) {
  // isoDate is YYYY-MM-DD
  return isoDate.slice(0, 7);
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; value: T };

function safeParseEntries(json: string | null): ParseResult<MoodEntriesRecord> {
  if (!json) return { ok: true, value: {} };
  try {
    const raw = JSON.parse(json) as any;
    const out = validateEntriesRecord(raw);
    // If the raw value is an object but validation strips everything:
    // - If raw is empty `{}`, it's valid (represents "no entries").
    // - If raw had keys, treat as corrupt (invalid keys/values were dropped).
    const rawIsObject = !!raw && typeof raw === 'object' && !Array.isArray(raw);
    const rawKeyCount = rawIsObject ? Object.keys(raw).length : 0;
    const ok = rawKeyCount === 0 || Object.keys(out).length > 0;
    if (!ok && rawIsObject) return { ok: false, value: {} };
    return { ok: true, value: out };
  } catch {
    logger.dev('storage.entries.parse.failed', { source: 'storage' });
    return { ok: false, value: {} };
  }
}

async function quarantineCorruptValue(rawJson: string): Promise<void> {
  const ts = Date.now();
  const backupKey = `${CORRUPT_PREFIX}${ts}`;
  try {
    // Store the raw value for forensic/debug recovery.
    await AsyncStorage.setItem(backupKey, rawJson);
  } catch (e) {
    logger.warn('storage.entries.corruptBackup.persistFailed', { key: STORAGE_KEY, error: e });
  }
  try {
    // Reset the primary key to keep the app functional.
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({}));
  } catch (e) {
    logger.error('storage.entries.corruptReset.failed', { key: STORAGE_KEY, error: e });
  }
}

function ensureEntriesByMonthCache(entries: MoodEntriesRecord): EntriesByMonthKey {
  if (entriesByMonthCache) return entriesByMonthCache;
  const grouped: EntriesByMonthKey = {};
  Object.keys(entries).forEach((iso) => {
    const mk = monthKeyFromIso(iso);
    (grouped[mk] ||= {})[iso] = entries[iso]!;
  });
  entriesByMonthCache = grouped;
  return grouped;
}

function setEntriesCache(next: MoodEntriesRecord) {
  entriesCache = next;
  entriesCountCache = Object.keys(next).length;
}

function invalidateDerivedCaches() {
  entriesByMonthCache = null;
  entriesSortedDescCache = null;
  moodCountsCache = null;
  monthDateKeysIndexCache = null;
  yearIndexCache = null;
}

function emptyMoodCounts(): MoodCounts {
  return { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
}

function ensureMoodCountsCache(entries: MoodEntriesRecord): MoodCounts {
  if (moodCountsCache) return moodCountsCache;
  const counts = emptyMoodCounts();
  for (const e of Object.values(entries)) {
    if (!e) continue;
    counts[e.mood] = (counts[e.mood] ?? 0) + 1;
  }
  moodCountsCache = counts;
  return counts;
}

function ensureMonthDateKeysIndexCache(entries: MoodEntriesRecord): MonthDateKeysIndex {
  if (monthDateKeysIndexCache) return monthDateKeysIndexCache;
  const byMonth = ensureEntriesByMonthCache(entries);
  const idx: MonthDateKeysIndex = {};
  for (const mk of Object.keys(byMonth)) {
    // Sort ascending so callers can binary search / iterate deterministically.
    idx[mk] = Object.keys(byMonth[mk]!).sort();
  }
  monthDateKeysIndexCache = idx;
  return idx;
}

function ensureYearIndexCache(entries: MoodEntriesRecord): YearIndex {
  if (yearIndexCache) return yearIndexCache;
  const idx: YearIndex = {};
  for (const e of Object.values(entries)) {
    if (!e) continue;
    const y = Number(e.date.slice(0, 4));
    const m0 = Number(e.date.slice(5, 7)) - 1;
    if (!Number.isFinite(y) || !Number.isFinite(m0) || m0 < 0 || m0 > 11) continue;
    const yearMap = (idx[y] ||= {});
    const bucket = (yearMap[m0] ||= { total: 0, counts: emptyMoodCounts() });
    bucket.total += 1;
    bucket.counts[e.mood] = (bucket.counts[e.mood] ?? 0) + 1;
  }
  yearIndexCache = idx;
  return idx;
}

function ensureEntriesSortedDescCache(entries: MoodEntriesRecord): MoodEntry[] {
  if (entriesSortedDescCache) return entriesSortedDescCache;
  entriesSortedDescCache = Object.values(entries).sort((a, b) => b.date.localeCompare(a.date));
  return entriesSortedDescCache;
}

function findInsertIndexDesc(arr: MoodEntry[], date: string): number {
  // Desc order: newest-first by ISO string compare.
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const midDate = arr[mid]!.date;
    // If midDate < date, date should come earlier (smaller index).
    if (midDate.localeCompare(date) < 0) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

function onUpsertUpdateDerivedCaches(prev: MoodEntry | undefined, next: MoodEntry) {
  // Sorted list (Journal)
  if (entriesSortedDescCache) {
    const base = entriesSortedDescCache;
    const arr = base.slice();
    const i = arr.findIndex((e) => e.date === next.date);
    if (i >= 0) arr.splice(i, 1);
    const ins = findInsertIndexDesc(arr, next.date);
    arr.splice(ins, 0, next);
    entriesSortedDescCache = arr;
  }

  // Mood counts (Settings)
  if (moodCountsCache) {
    const nextCounts: MoodCounts = { ...moodCountsCache };
    if (prev) nextCounts[prev.mood] = Math.max(0, (nextCounts[prev.mood] ?? 0) - 1);
    nextCounts[next.mood] = (nextCounts[next.mood] ?? 0) + 1;
    moodCountsCache = nextCounts;
  }

  // Month date keys index
  const mk = monthKeyFromIso(next.date);
  if (monthDateKeysIndexCache) {
    const baseIdx = monthDateKeysIndexCache;
    const baseList = baseIdx[mk] ?? [];
    if (!baseList.includes(next.date)) {
      const list = baseList.slice();
      // Insert into ascending list.
      let lo = 0;
      let hi = list.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (list[mid]!.localeCompare(next.date) < 0) lo = mid + 1;
        else hi = mid;
      }
      list.splice(lo, 0, next.date);
      monthDateKeysIndexCache = { ...baseIdx, [mk]: list };
    }
  }

  // Year index
  if (yearIndexCache) {
    const y = Number(next.date.slice(0, 4));
    const m0 = Number(next.date.slice(5, 7)) - 1;
    if (Number.isFinite(y) && Number.isFinite(m0) && m0 >= 0 && m0 <= 11) {
      const baseYearIdx = yearIndexCache;
      const baseYearMap = baseYearIdx[y] ?? {};
      const baseBucket = baseYearMap[m0] ?? { total: 0, counts: emptyMoodCounts() };
      const nextBucketCounts: MoodCounts = { ...baseBucket.counts };
      if (prev) nextBucketCounts[prev.mood] = Math.max(0, (nextBucketCounts[prev.mood] ?? 0) - 1);
      nextBucketCounts[next.mood] = (nextBucketCounts[next.mood] ?? 0) + 1;
      const nextBucket = {
        total: prev ? baseBucket.total : baseBucket.total + 1,
        counts: nextBucketCounts,
      };
      yearIndexCache = {
        ...baseYearIdx,
        [y]: {
          ...baseYearMap,
          [m0]: nextBucket,
        },
      };
    }
  }
}

function onDeleteUpdateDerivedCaches(prev: MoodEntry, date: string) {
  if (entriesSortedDescCache) {
    const base = entriesSortedDescCache;
    const i = base.findIndex((e) => e.date === date);
    if (i >= 0) {
      const arr = base.slice();
      arr.splice(i, 1);
      entriesSortedDescCache = arr;
    }
  }
  if (moodCountsCache) {
    const nextCounts: MoodCounts = { ...moodCountsCache };
    nextCounts[prev.mood] = Math.max(0, (nextCounts[prev.mood] ?? 0) - 1);
    moodCountsCache = nextCounts;
  }
  const mk = monthKeyFromIso(date);
  if (monthDateKeysIndexCache) {
    const baseIdx = monthDateKeysIndexCache;
    const baseList = baseIdx[mk];
    if (baseList) {
      const i = baseList.indexOf(date);
      if (i >= 0) {
        const list = baseList.slice();
        list.splice(i, 1);
        if (list.length === 0) {
          const nextIdx: MonthDateKeysIndex = { ...baseIdx };
          delete nextIdx[mk];
          monthDateKeysIndexCache = nextIdx;
        } else {
          monthDateKeysIndexCache = { ...baseIdx, [mk]: list };
        }
      }
    }
  }
  if (yearIndexCache) {
    const y = Number(date.slice(0, 4));
    const m0 = Number(date.slice(5, 7)) - 1;
    const baseYearIdx = yearIndexCache;
    const baseYearMap = baseYearIdx[y];
    const baseBucket = baseYearMap?.[m0];
    if (baseYearMap && baseBucket) {
      const nextTotal = Math.max(0, baseBucket.total - 1);
      const nextCounts: MoodCounts = { ...baseBucket.counts };
      nextCounts[prev.mood] = Math.max(0, (nextCounts[prev.mood] ?? 0) - 1);

      if (nextTotal === 0) {
        const nextYearMap: Record<number, { total: number; counts: MoodCounts }> = { ...baseYearMap };
        delete nextYearMap[m0];
        if (Object.keys(nextYearMap).length === 0) {
          const nextIdx: YearIndex = { ...baseYearIdx };
          delete nextIdx[y];
          yearIndexCache = nextIdx;
        } else {
          yearIndexCache = { ...baseYearIdx, [y]: nextYearMap };
        }
      } else {
        yearIndexCache = {
          ...baseYearIdx,
          [y]: {
            ...baseYearMap,
            [m0]: { total: nextTotal, counts: nextCounts },
          },
        };
      }
    }
  }
}

/**
 * Internal helper: persist a full entries record and update cache.
 * Used by demo seeding and (optionally) dev tooling.
 */
export async function setAllEntries(next: MoodEntriesRecord): Promise<void> {
  setEntriesCache(next);
  invalidateDerivedCaches();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Retrieve all entries as a record keyed by date
 */
export async function getAllEntries(): Promise<MoodEntriesRecord> {
  try {
    if (entriesCache) {
      lastAllEntriesSource = 'sessionCache';
      return entriesCache;
    }
    if (entriesLoadPromise) return entriesLoadPromise;

    entriesLoadPromise = (async () => {
      const json = await logger.perfMeasure(
        'storage.getAllEntries.getItem',
        { phase: 'cold', source: 'storage' },
        () => AsyncStorage.getItem(STORAGE_KEY)
      );
      const parsed = safeParseEntries(json);
      if (!parsed.ok && typeof json === 'string' && json.length > 0) {
        logger.warn('storage.entries.corrupt.detected', { key: STORAGE_KEY, action: 'quarantineAndReset' });
        await quarantineCorruptValue(json);
      }
      setEntriesCache(parsed.value);
      invalidateDerivedCaches();
      lastAllEntriesSource = 'storage';
      return parsed.value;
    })();

    try {
      return await entriesLoadPromise;
    } finally {
      entriesLoadPromise = null;
    }
  } catch (error) {
    logger.error('storage.entries.load.failed', { key: STORAGE_KEY, error });
    entriesLoadPromise = null;
    return {};
  }
}

/**
 * Retrieve entries grouped by month key (YYYY-MM).
 * Performance helper for CalendarScreen; does not change data semantics.
 */
export async function getEntriesByMonthKey(): Promise<EntriesByMonthKey> {
  const entries = await getAllEntries();
  return ensureEntriesByMonthCache(entries);
}

/**
 * Retrieve both the full entries record and the month-grouped index in one call.
 * Helps screens avoid duplicated work and extra regrouping on focus.
 */
export async function getAllEntriesWithMonthIndex(): Promise<{
  entries: MoodEntriesRecord;
  byMonthKey: EntriesByMonthKey;
}> {
  const entries = await getAllEntries();
  const byMonthKey = ensureEntriesByMonthCache(entries);
  return { entries, byMonthKey };
}

/**
 * Get a single entry by date
 * @param date - Date string in YYYY-MM-DD format
 */
export async function getEntry(date: string): Promise<MoodEntry | null> {
  if (!isValidISODateKey(date)) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // Fail fast in dev: screens should only request valid keys.
      throw new Error(`[moodStorage.getEntry] Invalid ISO date key: ${String(date)}`);
    }
    logger.warn('storage.entries.getEntry.invalidDateKey', { dateKey: date });
    return null;
  }
  if (entriesCache) return entriesCache[date] ?? null;
  const entries = await getAllEntries();
  return entries[date] ?? null;
}

/**
 * Create or update an entry (upsert)
 * Preserves createdAt on updates, always updates updatedAt
 */
export async function upsertEntry(entry: MoodEntry): Promise<void> {
  try {
    if (!isValidISODateKey(entry.date)) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        throw new Error(`[moodStorage.upsertEntry] Invalid ISO date key: ${String(entry.date)}`);
      }
      logger.warn('storage.entries.upsert.invalidDateKey', { dateKey: entry.date });
      return;
    }
    if (!VALID_MOOD_SET.has(entry.mood as MoodGrade)) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        throw new Error(`[moodStorage.upsertEntry] Invalid mood grade: ${String(entry.mood)}`);
      }
      logger.warn('storage.entries.upsert.invalidMood', { mood: entry.mood });
      return;
    }
    const now = Date.now();
    const prev = await getAllEntries();
    const existing = prev[entry.date];

    const safeNote = normalizeNote(entry.note);

    const next: MoodEntry = {
      ...entry,
      note: safeNote,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    // Dev-only invariant checks to fail fast during development.
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      if (next.createdAt > next.updatedAt) {
        throw new Error('[moodStorage.upsertEntry] Invariant violated: createdAt > updatedAt');
      }
      if (next.note.length > MAX_NOTE_LEN) {
        throw new Error('[moodStorage.upsertEntry] Invariant violated: note length exceeded MAX_NOTE_LEN');
      }
    }
    const entries: MoodEntriesRecord = { ...prev, [entry.date]: next };

    // Update derived caches synchronously (RAM-heavy, CPU-light).
    const mk = monthKeyFromIso(entry.date);
    if (entriesByMonthCache) {
      const base = entriesByMonthCache;
      const baseMonth = base[mk] ?? {};
      const nextMonth: MoodEntriesRecord = { ...baseMonth, [entry.date]: next };
      entriesByMonthCache = { ...base, [mk]: nextMonth };
    }
    onUpsertUpdateDerivedCaches(existing, next);

    setEntriesCache(entries);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    logger.error('storage.entries.upsert.failed', { key: STORAGE_KEY, error });
    throw error;
  }
}

/**
 * Delete an entry by date
 */
export async function deleteEntry(date: string): Promise<void> {
  try {
    if (!isValidISODateKey(date)) {
      logger.warn('storage.entries.delete.invalidDateKey', { dateKey: date });
      return;
    }
    const prev = await getAllEntries();
    const existing = prev[date];
    if (!existing) return;
    const entries: MoodEntriesRecord = { ...prev };
    delete entries[date];

    if (entriesByMonthCache) {
      const mk = monthKeyFromIso(date);
      const base = entriesByMonthCache;
      const monthMap = base[mk];
      if (monthMap && monthMap[date]) {
        const nextMonth: MoodEntriesRecord = { ...monthMap };
        delete nextMonth[date];
        if (Object.keys(nextMonth).length === 0) {
          const nextByMonth: EntriesByMonthKey = { ...base };
          delete nextByMonth[mk];
          entriesByMonthCache = nextByMonth;
        } else {
          entriesByMonthCache = { ...base, [mk]: nextMonth };
        }
      }
    }

    onDeleteUpdateDerivedCaches(existing, date);
    setEntriesCache(entries);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    logger.error('storage.entries.delete.failed', { key: STORAGE_KEY, error });
    throw error;
  }
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get all entries sorted by date (newest first)
 */
export async function getEntriesSortedDesc(): Promise<MoodEntry[]> {
  const entries = await getAllEntries();
  return ensureEntriesSortedDescCache(entries);
}

/**
 * Get entries within a date range (inclusive)
 */
export async function getEntriesInRange(
  startDate: string,
  endDate: string
): Promise<MoodEntry[]> {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (!isValidISODateKey(startDate) || !isValidISODateKey(endDate) || startDate > endDate) {
      throw new Error(
        `[moodStorage.getEntriesInRange] Invalid range: start=${String(startDate)} end=${String(endDate)}`
      );
    }
  }
  const entries = await getAllEntries();
  return Object.values(entries)
    .filter((e) => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get count of entries per mood grade
 */
export async function getMoodCounts(): Promise<Record<MoodGrade, number>> {
  const entries = await getAllEntries();
  return ensureMoodCountsCache(entries);
}

/**
 * RAM-heavy stats helper for Settings (and future internal use).
 * Avoids repeated `Object.keys/values` scans on focus.
 */
export async function getMoodStats(): Promise<{ totalEntries: number; moodCounts: MoodCounts }> {
  const entries = await getAllEntries();
  const moodCounts = ensureMoodCountsCache(entries);
  const totalEntries = entriesCountCache ?? Object.keys(entries).length;
  return { totalEntries, moodCounts };
}

/**
 * RAM-heavy index: monthKey -> sorted date keys.
 * Useful for calendar-related lookups without scanning the full store.
 */
export async function getMonthDateKeysIndex(): Promise<MonthDateKeysIndex> {
  const entries = await getAllEntries();
  return ensureMonthDateKeysIndexCache(entries);
}

/**
 * RAM-heavy index: year -> monthIndex0 -> distribution.
 * Built once per session (or updated incrementally on writes if already built).
 */
export async function getYearIndex(): Promise<YearIndex> {
  const entries = await getAllEntries();
  return ensureYearIndexCache(entries);
}

/**
 * Warm common RAM caches after the first paint so screens feel instant on first open.
 * Safe: does not change semantics; only precomputes derived views in-memory.
 */
export async function warmEntriesSessionCaches(): Promise<void> {
  const entries = await getAllEntries();
  ensureEntriesByMonthCache(entries);
  ensureEntriesSortedDescCache(entries);
  ensureMoodCountsCache(entries);
  ensureMonthDateKeysIndexCache(entries);
  ensureYearIndexCache(entries);
}

export function getEntriesSessionCacheDiagnostics(): {
  entriesCount: number;
  monthsIndexed: number;
  yearsIndexed: number;
  lastAllEntriesSource: import('../../lib/security/logger').PerfSource;
  hasByMonth: boolean;
  hasSorted: boolean;
  hasMoodCounts: boolean;
  hasMonthDateKeys: boolean;
  hasYearIndex: boolean;
} {
  const entriesCount = entriesCountCache ?? (entriesCache ? Object.keys(entriesCache).length : 0);
  const monthsIndexed = entriesByMonthCache ? Object.keys(entriesByMonthCache).length : 0;
  const yearsIndexed = yearIndexCache ? Object.keys(yearIndexCache).length : 0;
  return {
    entriesCount,
    monthsIndexed,
    yearsIndexed,
    lastAllEntriesSource,
    hasByMonth: !!entriesByMonthCache,
    hasSorted: !!entriesSortedDescCache,
    hasMoodCounts: !!moodCountsCache,
    hasMonthDateKeys: !!monthDateKeysIndexCache,
    hasYearIndex: !!yearIndexCache,
  };
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new MoodEntry object with defaults
 */
export function createEntry(
  date: string,
  mood: MoodGrade,
  note: string = ''
): MoodEntry {
  // Dev-only fail-fast: callers should never construct entries with invalid keys/moods.
  // In prod, runtime guards in `upsertEntry` keep the app resilient.
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (!isValidISODateKey(date)) {
      throw new Error(`[moodStorage.createEntry] Invalid ISO date key: ${String(date)}`);
    }
    if (!VALID_MOOD_SET.has(mood)) {
      throw new Error(`[moodStorage.createEntry] Invalid mood grade: ${String(mood)}`);
    }
  }
  const now = Date.now();
  return {
    date,
    mood,
    note: normalizeNote(note).slice(0, MAX_NOTE_LEN),
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// Debug / Dev Utils
// ============================================================================

/**
 * Clear all entries (use with caution!)
 */
export async function clearAllEntries(): Promise<void> {
  setEntriesCache({});
  entriesLoadPromise = null;
  invalidateDerivedCaches();
  await AsyncStorage.removeItem(STORAGE_KEY);
}

