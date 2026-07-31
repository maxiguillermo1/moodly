/**
 * @fileoverview AsyncStorage wrapper for mood entries (data layer source of truth)
 * @module data/storage/moodStorage
 *
 * Data is stored as a single JSON object keyed by date for O(1) access.
 * Key: "kairo.entries"
 * Value: Record<string, MoodEntry>
 *
 * Notes:
 * - Session in-memory cache for performance
 * - In-flight coalescing to avoid duplicate reads
 * - Safe parsing + typing guards to prevent corrupted storage crashes
 * - Immutable-on-write to keep state predictable and memoization-friendly
 */
import { logger } from '../../lib/security/logger';
import { isValidISODateKey, normalizeNote, validateEntriesRecord, VALID_MOOD_SET, MAX_NOTE_LEN } from '../model/entry';
import { assertLocalPersistenceWritable, ensureLocalPersistenceReady } from '../persistence/bootstrap';
import { clearMoodEntriesOnDisk, deleteMoodEntryRow, loadMoodEntriesFromDisk, moodEntriesUsesSqlite, MOOD_ENTRIES_STORAGE_KEY, persistMoodEntriesBlob, persistMoodEntryRow, quarantineRawMoodEntriesJson, readRawMoodEntriesJson, } from './moodEntriesBackend';
import { notifyMoodEntryDeleted, notifyMoodEntryUpserted } from '../sync/syncBridge';
const STORAGE_KEY = MOOD_ENTRIES_STORAGE_KEY;
const CORRUPT_PREFIX = `${STORAGE_KEY}.corrupt.`;
// In-memory cache for the session (performance-only; does not change semantics).
let entriesCache = null;
let entriesLoadPromise = null;
/**
 * Write serialization (reliability).
 *
 * AsyncStorage operations are async and UI can trigger overlapping writes (double-tap,
 * multiple screens, backgrounding mid-save). Without a lock, two writes can race and
 * silently lose data (last writer wins).
 *
 * This queue guarantees that mutations to `kairo.entries` are applied sequentially.
 * It does NOT change storage semantics/keys; it only prevents races.
 */
let entriesWriteTail = Promise.resolve();
async function withEntriesWriteLock(op) {
    const prev = entriesWriteTail;
    let release;
    entriesWriteTail = new Promise((r) => {
        release = r;
    });
    await prev;
    try {
        return await op();
    }
    finally {
        release();
    }
}
let entriesByMonthCache = null;
// Derived cache: sorted list for JournalScreen (newest first).
let entriesSortedDescCache = null;
let moodCountsCache = null;
let monthDateKeysIndexCache = null;
let yearIndexCache = null;
// Tiny metadata cache (for dev diagnostics + fast stats).
let entriesCountCache = null;
let lastAllEntriesSource = 'storage';
export function getLastAllEntriesSource() {
    return lastAllEntriesSource;
}
function monthKeyFromIso(isoDate) {
    // isoDate is YYYY-MM-DD
    return isoDate.slice(0, 7);
}
function cloneEntry(entry) {
    return { ...entry };
}
function cloneEntriesRecord(entries) {
    const out = {};
    for (const [key, entry] of Object.entries(entries)) {
        if (entry)
            out[key] = cloneEntry(entry);
    }
    return out;
}
function cloneEntriesByMonth(map) {
    const out = {};
    for (const [monthKey, entries] of Object.entries(map)) {
        out[monthKey] = cloneEntriesRecord(entries);
    }
    return out;
}
function cloneMoodCounts(counts) {
    return { ...counts };
}
function safeParseEntries(json) {
    if (!json)
        return { ok: true, value: {} };
    try {
        const raw = JSON.parse(json);
        const out = validateEntriesRecord(raw);
        // If the raw value is an object but validation strips everything:
        // - If raw is empty `{}`, it's valid (represents "no entries").
        // - If raw had keys, treat as corrupt (invalid keys/values were dropped).
        const rawIsObject = !!raw && typeof raw === 'object' && !Array.isArray(raw);
        const rawKeyCount = rawIsObject ? Object.keys(raw).length : 0;
        const ok = rawKeyCount === 0 || Object.keys(out).length > 0;
        if (!ok && rawIsObject)
            return { ok: false, value: {} };
        return { ok: true, value: out };
    }
    catch {
        logger.dev('storage.entries.parse.failed', { source: 'storage' });
        return { ok: false, value: {} };
    }
}
async function quarantineCorruptValue(rawJson) {
    const ts = Date.now();
    const backupKey = `${CORRUPT_PREFIX}${ts}`;
    try {
        await quarantineRawMoodEntriesJson(rawJson, backupKey);
    }
    catch (e) {
        logger.warn('storage.entries.corruptBackup.persistFailed', { key: STORAGE_KEY, error: e });
        logger.error('storage.entries.corruptReset.failed', { key: STORAGE_KEY, error: e });
    }
}
function ensureEntriesByMonthCache(entries) {
    if (entriesByMonthCache)
        return entriesByMonthCache;
    const grouped = {};
    Object.keys(entries).forEach((iso) => {
        const mk = monthKeyFromIso(iso);
        (grouped[mk] || (grouped[mk] = {}))[iso] = entries[iso];
    });
    entriesByMonthCache = grouped;
    return grouped;
}
let entriesSessionEpoch = 0;
/** Bumps when the in-memory entries cache identity changes (writes + cold load). */
export function getEntriesSessionEpoch() {
    return entriesSessionEpoch;
}
function setEntriesCache(next) {
    entriesCache = next;
    entriesCountCache = Object.keys(next).length;
    entriesSessionEpoch += 1;
}
function invalidateDerivedCaches() {
    entriesByMonthCache = null;
    entriesSortedDescCache = null;
    moodCountsCache = null;
    monthDateKeysIndexCache = null;
    yearIndexCache = null;
}
function emptyMoodCounts() {
    return { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
}
function ensureMoodCountsCache(entries) {
    if (moodCountsCache)
        return moodCountsCache;
    const counts = emptyMoodCounts();
    for (const e of Object.values(entries)) {
        if (!e)
            continue;
        counts[e.mood] = (counts[e.mood] ?? 0) + 1;
    }
    moodCountsCache = counts;
    return counts;
}
function ensureMonthDateKeysIndexCache(entries) {
    if (monthDateKeysIndexCache)
        return monthDateKeysIndexCache;
    const byMonth = ensureEntriesByMonthCache(entries);
    const idx = {};
    for (const mk of Object.keys(byMonth)) {
        // Sort ascending so callers can binary search / iterate deterministically.
        idx[mk] = Object.keys(byMonth[mk]).sort();
    }
    monthDateKeysIndexCache = idx;
    return idx;
}
function ensureYearIndexCache(entries) {
    if (yearIndexCache)
        return yearIndexCache;
    const idx = {};
    for (const e of Object.values(entries)) {
        if (!e)
            continue;
        const y = Number(e.date.slice(0, 4));
        const m0 = Number(e.date.slice(5, 7)) - 1;
        if (!Number.isFinite(y) || !Number.isFinite(m0) || m0 < 0 || m0 > 11)
            continue;
        const yearMap = (idx[y] || (idx[y] = {}));
        const bucket = (yearMap[m0] || (yearMap[m0] = { total: 0, counts: emptyMoodCounts() }));
        bucket.total += 1;
        bucket.counts[e.mood] = (bucket.counts[e.mood] ?? 0) + 1;
    }
    yearIndexCache = idx;
    return idx;
}
function ensureEntriesSortedDescCache(entries) {
    if (entriesSortedDescCache)
        return entriesSortedDescCache;
    entriesSortedDescCache = Object.values(entries).sort((a, b) => b.date.localeCompare(a.date));
    return entriesSortedDescCache;
}
async function coldLoadEntriesFromPersistence() {
    if (await moodEntriesUsesSqlite()) {
        const record = await loadMoodEntriesFromDisk();
        return { parsed: { ok: true, value: record }, rawJson: null };
    }
    const rawJson = await readRawMoodEntriesJson();
    return { parsed: safeParseEntries(rawJson), rawJson };
}
function findInsertIndexDesc(arr, date) {
    // Desc order: newest-first by ISO string compare.
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        const midDate = arr[mid].date;
        // If midDate < date, date should come earlier (smaller index).
        if (midDate.localeCompare(date) < 0)
            hi = mid;
        else
            lo = mid + 1;
    }
    return lo;
}
function onUpsertUpdateDerivedCaches(prev, next) {
    // Sorted list (Journal)
    if (entriesSortedDescCache) {
        const base = entriesSortedDescCache;
        const arr = base.slice();
        const i = arr.findIndex((e) => e.date === next.date);
        if (i >= 0)
            arr.splice(i, 1);
        const ins = findInsertIndexDesc(arr, next.date);
        arr.splice(ins, 0, next);
        entriesSortedDescCache = arr;
    }
    // Mood counts (Settings)
    if (moodCountsCache) {
        const nextCounts = { ...moodCountsCache };
        if (prev)
            nextCounts[prev.mood] = Math.max(0, (nextCounts[prev.mood] ?? 0) - 1);
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
                if (list[mid].localeCompare(next.date) < 0)
                    lo = mid + 1;
                else
                    hi = mid;
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
            const nextBucketCounts = { ...baseBucket.counts };
            if (prev)
                nextBucketCounts[prev.mood] = Math.max(0, (nextBucketCounts[prev.mood] ?? 0) - 1);
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
function onDeleteUpdateDerivedCaches(prev, date) {
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
        const nextCounts = { ...moodCountsCache };
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
                    const nextIdx = { ...baseIdx };
                    delete nextIdx[mk];
                    monthDateKeysIndexCache = nextIdx;
                }
                else {
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
            const nextCounts = { ...baseBucket.counts };
            nextCounts[prev.mood] = Math.max(0, (nextCounts[prev.mood] ?? 0) - 1);
            if (nextTotal === 0) {
                const nextYearMap = { ...baseYearMap };
                delete nextYearMap[m0];
                if (Object.keys(nextYearMap).length === 0) {
                    const nextIdx = { ...baseYearIdx };
                    delete nextIdx[y];
                    yearIndexCache = nextIdx;
                }
                else {
                    yearIndexCache = { ...baseYearIdx, [y]: nextYearMap };
                }
            }
            else {
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
export async function setAllEntries(next) {
    await ensureLocalPersistenceReady();
    assertLocalPersistenceWritable();
    await withEntriesWriteLock(async () => {
        // Persist first. Only update RAM caches after the write succeeds.
        // This prevents a failed write from leaving the app in a "looks saved but isn't" state.
        await persistMoodEntriesBlob(next);
        setEntriesCache(next);
        invalidateDerivedCaches();
    });
}
// ============================================================================
// CRUD Operations
// ============================================================================
/**
 * Warm `entriesCache` without returning a defensive copy (write-lock / snapshot paths only).
 */
async function loadEntriesCacheIfNeeded() {
    if (entriesCache)
        return entriesCache;
    await ensureLocalPersistenceReady();
    if (entriesLoadPromise) {
        await entriesLoadPromise;
        return entriesCache ?? {};
    }
    entriesLoadPromise = (async () => {
        const { parsed, rawJson } = await logger.perfMeasure('storage.getAllEntries.getItem', { phase: 'cold', source: 'storage' }, async () => coldLoadEntriesFromPersistence());
        if (!parsed.ok && typeof rawJson === 'string' && rawJson.length > 0) {
            logger.warn('storage.entries.corrupt.detected', { key: STORAGE_KEY, action: 'quarantineAndReset' });
            await quarantineCorruptValue(rawJson);
        }
        setEntriesCache(parsed.value);
        invalidateDerivedCaches();
        lastAllEntriesSource = 'storage';
        return parsed.value;
    })();
    try {
        await entriesLoadPromise;
    }
    finally {
        entriesLoadPromise = null;
    }
    return entriesCache ?? {};
}
/**
 * Retrieve all entries as a record keyed by date
 */
export async function getAllEntries() {
    try {
        if (entriesCache) {
            lastAllEntriesSource = 'sessionCache';
            return cloneEntriesRecord(entriesCache);
        }
        await ensureLocalPersistenceReady();
        if (entriesLoadPromise)
            return entriesLoadPromise;
        entriesLoadPromise = (async () => {
            const { parsed, rawJson } = await logger.perfMeasure('storage.getAllEntries.getItem', { phase: 'cold', source: 'storage' }, async () => coldLoadEntriesFromPersistence());
            if (!parsed.ok && typeof rawJson === 'string' && rawJson.length > 0) {
                logger.warn('storage.entries.corrupt.detected', { key: STORAGE_KEY, action: 'quarantineAndReset' });
                await quarantineCorruptValue(rawJson);
            }
            setEntriesCache(parsed.value);
            invalidateDerivedCaches();
            lastAllEntriesSource = 'storage';
            return cloneEntriesRecord(parsed.value);
        })();
        try {
            return await entriesLoadPromise;
        }
        finally {
            entriesLoadPromise = null;
        }
    }
    catch (error) {
        logger.error('storage.entries.load.failed', { key: STORAGE_KEY, error });
        entriesLoadPromise = null;
        return {};
    }
}
/**
 * Retrieve both the full entries record and the month-grouped index in one call.
 * Helps screens avoid duplicated work and extra regrouping on focus.
 */
export async function getAllEntriesWithMonthIndex() {
    const entries = await loadEntriesCacheIfNeeded();
    const byMonthKey = ensureEntriesByMonthCache(entries);
    return { entries: cloneEntriesRecord(entries), byMonthKey: cloneEntriesByMonth(byMonthKey) };
}
/**
 * Calendar hot path: stable month-map references until entries actually change.
 *
 * Keep this scoped to read-only calendar render paths. Public mutation-safe APIs above
 * return defensive copies; this one preserves identity for render invalidation.
 */
export async function getCalendarEntriesByMonthIndexSnapshot() {
    if (!entriesCache) {
        await getAllEntries();
    }
    return ensureEntriesByMonthCache(entriesCache ?? {});
}
/**
 * Sync read when `entriesCache` is already warm (startup warm / prior tab load).
 * Returns `undefined` when the cache is not ready — caller should fall back to async snapshot.
 */
export function peekCalendarEntriesByMonthIndexFromSessionCache() {
    if (!entriesCache)
        return undefined;
    lastAllEntriesSource = 'sessionCache';
    return ensureEntriesByMonthCache(entriesCache);
}
/**
 * Get a single entry by date
 * @param date - Date string in YYYY-MM-DD format
 */
/**
 * Sync read when `entriesCache` is already warm (startup warm / prior tab load).
 * Returns `undefined` when the cache is not ready — caller should fall back to `getEntry`.
 */
export function peekEntryFromSessionCache(date) {
    if (!isValidISODateKey(date)) {
        return null;
    }
    if (!entriesCache) {
        return undefined;
    }
    const row = entriesCache[date];
    return row ? cloneEntry(row) : null;
}
export async function getEntry(date) {
    if (!isValidISODateKey(date)) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
            // Fail fast in dev: screens should only request valid keys.
            throw new Error(`[moodStorage.getEntry] Invalid ISO date key: ${String(date)}`);
        }
        logger.warn('storage.entries.getEntry.invalidDateKey', { dateKey: date });
        return null;
    }
    const peeked = peekEntryFromSessionCache(date);
    if (peeked !== undefined) {
        return peeked;
    }
    const entries = await getAllEntries();
    return entries[date] ? cloneEntry(entries[date]) : null;
}
/**
 * Create or update an entry (upsert)
 * Preserves createdAt on updates, always updates updatedAt
 */
export async function upsertEntry(entry) {
    return withEntriesWriteLock(async () => {
        try {
            await ensureLocalPersistenceReady();
            if (!isValidISODateKey(entry.date)) {
                logger.warn('storage.entries.upsert.invalidDateKey', { dateKey: entry.date });
                throw new Error(`[moodStorage.upsertEntry] Invalid ISO date key: ${String(entry.date)}`);
            }
            if (!VALID_MOOD_SET.has(entry.mood)) {
                logger.warn('storage.entries.upsert.invalidMood', { mood: entry.mood });
                throw new Error(`[moodStorage.upsertEntry] Invalid mood grade: ${String(entry.mood)}`);
            }
            const now = Date.now();
            const prev = await loadEntriesCacheIfNeeded();
            const existing = prev[entry.date];
            const safeNote = normalizeNote(entry.note);
            const createdAt = existing?.createdAt ?? now;
            // Never allow updatedAt < createdAt (clock skew, imports, or legacy rows); keeps saves working.
            const updatedAt = Math.max(now, createdAt);
            const next = {
                ...entry,
                note: safeNote,
                createdAt,
                updatedAt,
            };
            // Dev-only invariant checks to fail fast during development.
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
                if (next.note.length > MAX_NOTE_LEN) {
                    throw new Error('[moodStorage.upsertEntry] Invariant violated: note length exceeded MAX_NOTE_LEN');
                }
            }
            const entries = { ...prev, [entry.date]: next };
            // Persist first. Only update RAM caches after the write succeeds.
            assertLocalPersistenceWritable();
            await persistMoodEntryRow(next, entries);
            // Update derived caches (RAM-heavy, CPU-light) *after* persistence commits.
            const mk = monthKeyFromIso(entry.date);
            if (entriesByMonthCache) {
                const base = entriesByMonthCache;
                const baseMonth = base[mk] ?? {};
                const nextMonth = { ...baseMonth, [entry.date]: next };
                entriesByMonthCache = { ...base, [mk]: nextMonth };
            }
            onUpsertUpdateDerivedCaches(existing, next);
            setEntriesCache(entries);
            notifyMoodEntryUpserted(next);
        }
        catch (error) {
            logger.error('storage.entries.upsert.failed', { key: STORAGE_KEY, error });
            throw error;
        }
    });
}
/**
 * Delete an entry by date
 */
export async function deleteEntry(date) {
    return withEntriesWriteLock(async () => {
        try {
            if (!isValidISODateKey(date)) {
                logger.warn('storage.entries.delete.invalidDateKey', { dateKey: date });
                return;
            }
            const prev = await loadEntriesCacheIfNeeded();
            const existing = prev[date];
            if (!existing)
                return;
            const entries = { ...prev };
            delete entries[date];
            // Persist first. Only update RAM caches after the write succeeds.
            assertLocalPersistenceWritable();
            await deleteMoodEntryRow(date, entries);
            if (entriesByMonthCache) {
                const mk = monthKeyFromIso(date);
                const base = entriesByMonthCache;
                const monthMap = base[mk];
                if (monthMap && monthMap[date]) {
                    const nextMonth = { ...monthMap };
                    delete nextMonth[date];
                    if (Object.keys(nextMonth).length === 0) {
                        const nextByMonth = { ...base };
                        delete nextByMonth[mk];
                        entriesByMonthCache = nextByMonth;
                    }
                    else {
                        entriesByMonthCache = { ...base, [mk]: nextMonth };
                    }
                }
            }
            onDeleteUpdateDerivedCaches(existing, date);
            setEntriesCache(entries);
            notifyMoodEntryDeleted(date);
        }
        catch (error) {
            logger.error('storage.entries.delete.failed', { key: STORAGE_KEY, error });
            throw error;
        }
    });
}
// ============================================================================
// Query Helpers
// ============================================================================
/**
 * Get all entries sorted by date (newest first)
 */
export async function getEntriesSortedDesc() {
    const entries = await getAllEntries();
    return ensureEntriesSortedDescCache(entries).map(cloneEntry);
}
/**
 * Sync read when `entriesCache` is already warm (startup warm / prior tab load).
 * Returns `undefined` when the cache is not ready — caller should fall back to async snapshot.
 */
export function peekJournalEntriesSortedDescFromSessionCache() {
    if (!entriesCache)
        return undefined;
    lastAllEntriesSource = 'sessionCache';
    return ensureEntriesSortedDescCache(entriesCache);
}
/**
 * Journal hot path: stable sorted-array identity until entries change (read-only).
 * Callers must not mutate returned rows; use `getEntriesSortedDesc` when a defensive copy is required.
 */
export async function getJournalEntriesSortedDescSnapshot() {
    const entries = await loadEntriesCacheIfNeeded();
    lastAllEntriesSource = entriesCache ? 'sessionCache' : lastAllEntriesSource;
    return ensureEntriesSortedDescCache(entries);
}
/**
 * Get mood distribution + totals for Settings (and internal cache warming).
 */
export async function getMoodStats() {
    const entries = await getAllEntries();
    const moodCounts = ensureMoodCountsCache(entries);
    const totalEntries = entriesCountCache ?? Object.keys(entries).length;
    return { totalEntries, moodCounts: cloneMoodCounts(moodCounts) };
}
/**
 * Prime raw `kairo.entries` in RAM (no derived indexes). Used on app startup so Today can
 * `getEntry` without cloning the full record; calendar/journal indexes build on demand.
 */
export async function primeEntriesSessionCache() {
    await loadEntriesCacheIfNeeded();
}
/**
 * Warm journal sorted list when raw entries are already in RAM (no disk I/O).
 * Safe to call from post-interaction idle hooks after `primeEntriesSessionCache`.
 */
export function warmJournalSortedDescCacheIfPrimed() {
    if (!entriesCache)
        return;
    ensureEntriesSortedDescCache(entriesCache);
}
/**
 * Warm common RAM caches after the first paint so screens feel instant on first open.
 * Safe: does not change semantics; only precomputes derived views in-memory.
 */
export async function warmEntriesSessionCaches() {
    const entries = await loadEntriesCacheIfNeeded();
    ensureEntriesByMonthCache(entries);
    ensureEntriesSortedDescCache(entries);
    ensureMoodCountsCache(entries);
    ensureMonthDateKeysIndexCache(entries);
    ensureYearIndexCache(entries);
}
export function getEntriesSessionCacheDiagnostics() {
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
export function createEntry(date, mood, note = '') {
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
export async function clearAllEntries() {
    await withEntriesWriteLock(async () => {
        // Persist first. Only update RAM caches after the write succeeds.
        await ensureLocalPersistenceReady();
        assertLocalPersistenceWritable();
        await clearMoodEntriesOnDisk();
        setEntriesCache({});
        entriesLoadPromise = null;
        invalidateDerivedCaches();
    });
}
/**
 * @internal Jest-only: simulate a cold read path without `jest.resetModules()`.
 *
 * Remounting modules clears the in-memory AsyncStorage mock and drops persisted fixtures;
 * use this helper when tests need “session lost, disk intact” semantics.
 */
export function resetEntriesStorageSessionStateForTests() {
    if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test')
        return;
    invalidateMoodEntriesSessionCache();
}
export function invalidateMoodEntriesSessionCache() {
    entriesCache = null;
    entriesLoadPromise = null;
    entriesWriteTail = Promise.resolve();
    entriesByMonthCache = null;
    entriesSortedDescCache = null;
    moodCountsCache = null;
    monthDateKeysIndexCache = null;
    yearIndexCache = null;
    entriesCountCache = null;
    entriesSessionEpoch = 0;
}
