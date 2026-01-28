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
import { devTimeAsync, devWarn } from '../../lib/utils/devPerf';
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
    devWarn('[moodStorage] JSON parse failed; falling back to empty store');
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
    logger.warn('[moodStorage] Failed to persist corrupt backup', e);
  }
  try {
    // Reset the primary key to keep the app functional.
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({}));
  } catch (e) {
    logger.error('[moodStorage] Failed to reset corrupt store', e);
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

function setCache(next: MoodEntriesRecord) {
  entriesCache = next;
  // Invalidate derived cache; it will be rebuilt lazily when requested.
  entriesByMonthCache = null;
  entriesSortedDescCache = null;
}

/**
 * Internal helper: persist a full entries record and update cache.
 * Used by demo seeding and (optionally) dev tooling.
 */
export async function setAllEntries(next: MoodEntriesRecord): Promise<void> {
  setCache(next);
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
    if (entriesCache) return entriesCache;
    if (entriesLoadPromise) return entriesLoadPromise;

    entriesLoadPromise = (async () => {
      const json = await devTimeAsync('[storage] getAllEntries.getItem', () =>
        AsyncStorage.getItem(STORAGE_KEY)
      );
      const parsed = safeParseEntries(json);
      if (!parsed.ok && typeof json === 'string' && json.length > 0) {
        logger.warn('[moodStorage] Corrupt entries detected; quarantining and resetting');
        await quarantineCorruptValue(json);
      }
      setCache(parsed.value);
      return parsed.value;
    })();

    try {
      return await entriesLoadPromise;
    } finally {
      entriesLoadPromise = null;
    }
  } catch (error) {
    logger.error('[moodStorage] Failed to load entries', error);
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
    logger.warn('[moodStorage] getEntry called with invalid date', { date });
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
      logger.warn('[moodStorage] upsertEntry called with invalid date', { date: entry.date });
      return;
    }
    if (!VALID_MOOD_SET.has(entry.mood as MoodGrade)) {
      logger.warn('[moodStorage] upsertEntry called with invalid mood', { mood: entry.mood });
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
    const entries: MoodEntriesRecord = { ...prev, [entry.date]: next };

    // Keep derived month index warm (low-risk perf win for CalendarScreen).
    const mk = monthKeyFromIso(entry.date);
    if (entriesByMonthCache) {
      (entriesByMonthCache[mk] ||= {})[entry.date] = next;
    }

    setCache(entries);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    logger.error('[moodStorage] Failed to save entry', error);
    throw error;
  }
}

/**
 * Delete an entry by date
 */
export async function deleteEntry(date: string): Promise<void> {
  try {
    if (!isValidISODateKey(date)) {
      logger.warn('[moodStorage] deleteEntry called with invalid date', { date });
      return;
    }
    const prev = await getAllEntries();
    if (!prev[date]) return;
    const entries: MoodEntriesRecord = { ...prev };
    delete entries[date];

    if (entriesByMonthCache) {
      const mk = monthKeyFromIso(date);
      const monthMap = entriesByMonthCache[mk];
      if (monthMap) {
        delete monthMap[date];
        if (Object.keys(monthMap).length === 0) delete entriesByMonthCache[mk];
      }
    }

    setCache(entries);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    logger.error('[moodStorage] Failed to delete entry', error);
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
  if (entriesSortedDescCache) return entriesSortedDescCache;
  entriesSortedDescCache = Object.values(entries).sort((a, b) => b.date.localeCompare(a.date));
  return entriesSortedDescCache;
}

/**
 * Get entries within a date range (inclusive)
 */
export async function getEntriesInRange(
  startDate: string,
  endDate: string
): Promise<MoodEntry[]> {
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
  const counts: Record<MoodGrade, number> = {
    'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0,
  };

  Object.values(entries).forEach((entry) => {
    counts[entry.mood]++;
  });

  return counts;
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
  entriesCache = {};
  entriesLoadPromise = null;
  entriesByMonthCache = {};
  await AsyncStorage.removeItem(STORAGE_KEY);
}

