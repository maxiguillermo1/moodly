/**
 * @fileoverview Per-day habit chip selections (AsyncStorage)
 * @module data/storage/habitSelectionsStorage
 *
 * ## Storage contract (`kairo.habitSelections`)
 *
 * - **Single source of truth**: `selections` — `Record<YYYY-MM-DD, HabitId[]>` (local calendar day keys only).
 * - **Version**: On disk, values are wrapped as **`{ v: 3, selections, toggleTotals }`**. `v` must be `3` for the
 *   canonical envelope (legacy `v: 2` and flat v1 maps are read and rewritten forward).
 * - **`toggleTotals`**: **Deprecated compatibility field only.** It is always normalized to **`{}`** on read and
 *   write. It must **never** be incremented, merged into UI counts, or trusted for rendering. Marked-day totals
 *   are **derived only** from `selections` via {@link getHabitMarkedDayCounts}.
 * - **Day rows**: Each date key maps to a **deduplicated** list of catalog `HabitId`s in **stable catalog order**
 *   (`HABIT_IDS`). Empty days are **omitted** (no `[]` shards).
 * - **Writes**: All mutations run behind a **process-wide write queue** (`withWriteLock`) so parallel toggles
 *   serialize to one coherent read-modify-write per persistence tick. A single `JSON.stringify` payload is written
 *   per change (atomic at the AsyncStorage key level).
 * - **Corruption**: Invalid JSON or non-recoverable shapes are **quarantined** (backup key) and replaced with an
 *   empty canonical payload; callers receive safe empty reads (no throws into UI).
 * - **Derived counts**: `O(number of date keys that have ≥1 habit)` — one pass over normalized `selections`.
 *   UI must not call marked-day reads from Today/journal extension paths (see Habits screen only).
 * - **Latency**: Optimistic UI is synchronous. **`toggleHabitForDate`** returns {@link HabitToggleResult} with
 *   **precomputed** `markedDayCounts` so Habits skips a second scan. **AsyncStorage** I/O remains **async** (often
 *   **≫1 ms**); never promise universal sub‑ms disk — budget **one frame** for interaction paint.
 */

import type { HabitId } from '../../lib/constants/habitsCatalog';
import { HABIT_IDS, isHabitId } from '../../lib/constants/habitsCatalog';
import { logger } from '../../lib/security/logger';
import { isValidISODateKey } from '../model/entry';
import { assertLocalPersistenceWritable, ensureLocalPersistenceReady } from '../persistence/bootstrap';
import {
  clearHabitSelectionsOnDisk,
  loadHabitSelectionsJsonFromDisk,
  persistHabitSelectionsJsonToDisk,
  quarantineRawHabitSelectionsJson,
} from './habitSelectionsBackend';
import { notifyHabitSelectionsChanged } from '../sync/syncBridge';
import type { HabitSelectionsRecord } from './habitSelectionsTypes';

export type { HabitSelectionsRecord } from './habitSelectionsTypes';

const STORAGE_KEY = 'kairo.habitSelections';
const STORAGE_VERSION = 3;
const CORRUPT_PREFIX = `${STORAGE_KEY}.corrupt.`;

/** Per habit: how many distinct local days that habit is marked on in `selections`. */
export type HabitMarkedDayCountsRecord = Partial<Record<HabitId, number>>;

/** Result of {@link toggleHabitForDate} — includes fresh marked-day totals without a second `getBundle` + scan. */
export type HabitToggleResult = {
  habitIdsForDate: HabitId[];
  markedDayCounts: HabitMarkedDayCountsRecord;
};

type HabitPersistBundle = {
  selections: HabitSelectionsRecord;
  /** Deprecated; always `{}` on read/write. */
  toggleTotals: HabitMarkedDayCountsRecord;
};

let cache: HabitPersistBundle | null = null;
let loadPromise: Promise<HabitPersistBundle> | null = null;
let cacheGeneration = 0;

let writeTail: Promise<void> = Promise.resolve();

async function withWriteLock<T>(op: () => Promise<T>): Promise<T> {
  const prev = writeTail;
  let release!: () => void;
  writeTail = new Promise<void>((r) => {
    release = r;
  });
  await prev;
  try {
    return await op();
  } finally {
    release();
  }
}

function diskVersionIs(value: unknown, expected: number): boolean {
  if (value === expected) return true;
  if (typeof value === 'string' && Number(value) === expected) return true;
  if (typeof value === 'number' && Number.isFinite(value) && Math.floor(value) === expected) return true;
  return false;
}

function normalizeDaySelections(ids: unknown): HabitId[] | null {
  if (!Array.isArray(ids)) return null;
  const out: HabitId[] = [];
  const seen = new Set<string>();
  for (const x of ids) {
    if (typeof x !== 'string' || !isHabitId(x) || seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

/** Deterministic catalog order + dedupe for persisted day arrays and derived-count scans. */
function orderHabitIdsForPersist(ids: readonly HabitId[]): HabitId[] {
  const set = new Set(ids);
  return HABIT_IDS.filter((id) => set.has(id));
}

function parseSelectionsRoot(raw: unknown): HabitSelectionsRecord {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const selections: HabitSelectionsRecord = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isValidISODateKey(k)) continue;
    const normalized = normalizeDaySelections(v);
    if (normalized && normalized.length > 0) selections[k] = orderHabitIdsForPersist(normalized);
  }
  return selections;
}

function legacyToggleTotalsNonEmpty(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  for (const [id, c] of Object.entries(raw as Record<string, unknown>)) {
    if (!isHabitId(id)) continue;
    const n = typeof c === 'number' && Number.isFinite(c) ? Math.floor(c) : 0;
    if (n > 0) return true;
  }
  return false;
}

function migrateLegacyFlatRecord(root: Record<string, unknown>): HabitPersistBundle {
  return { selections: parseSelectionsRoot(root), toggleTotals: {} };
}

function isV3Envelope(raw: Record<string, unknown>): boolean {
  return diskVersionIs(raw.v, STORAGE_VERSION);
}

function isV2Envelope(raw: Record<string, unknown>): boolean {
  return diskVersionIs(raw.v, 2);
}

type ParseResult = {
  bundle: HabitPersistBundle;
  corrupt: boolean;
  shouldMigrateToCanonicalDisk: boolean;
};

function safeParse(json: string | null): ParseResult {
  if (!json)
    return { bundle: { selections: {}, toggleTotals: {} }, corrupt: false, shouldMigrateToCanonicalDisk: false };
  try {
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { bundle: { selections: {}, toggleTotals: {} }, corrupt: true, shouldMigrateToCanonicalDisk: false };
    }
    const o = raw as Record<string, unknown>;

    if (isV3Envelope(o)) {
      const selections = parseSelectionsRoot(o.selections ?? {});
      const hadLegacyTotals = legacyToggleTotalsNonEmpty(o.toggleTotals);
      return {
        bundle: { selections, toggleTotals: {} },
        corrupt: false,
        shouldMigrateToCanonicalDisk: hadLegacyTotals,
      };
    }

    if (isV2Envelope(o)) {
      const selections = parseSelectionsRoot(o.selections ?? {});
      return { bundle: { selections, toggleTotals: {} }, corrupt: false, shouldMigrateToCanonicalDisk: true };
    }

    /** Unknown future `v` with a recoverable `selections` object — forward-migrate instead of wiping user data. */
    if ('v' in o) {
      const sel = o.selections;
      if (sel != null && typeof sel === 'object' && !Array.isArray(sel)) {
        const selections = parseSelectionsRoot(sel);
        return { bundle: { selections, toggleTotals: {} }, corrupt: false, shouldMigrateToCanonicalDisk: true };
      }
      return { bundle: { selections: {}, toggleTotals: {} }, corrupt: true, shouldMigrateToCanonicalDisk: false };
    }

    return {
      bundle: migrateLegacyFlatRecord(o),
      corrupt: false,
      shouldMigrateToCanonicalDisk: true,
    };
  } catch {
    return { bundle: { selections: {}, toggleTotals: {} }, corrupt: true, shouldMigrateToCanonicalDisk: false };
  }
}

function serializeCanonicalSelections(selections: HabitSelectionsRecord): string {
  return JSON.stringify({ v: STORAGE_VERSION, selections, toggleTotals: {} });
}

/**
 * Count distinct local calendar days per habit. Inputs must already be {@link parseSelectionsRoot}-normalized
 * (valid day keys, catalog ids only, deduped per day). Complexity: **O(days with data × habits that day)**.
 */
function deriveMarkedDayCountsFromSelections(selections: HabitSelectionsRecord): HabitMarkedDayCountsRecord {
  const counts: HabitMarkedDayCountsRecord = {};
  for (const ids of Object.values(selections)) {
    for (const id of ids) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return counts;
}

function sanitizeBundle(input: HabitPersistBundle): HabitPersistBundle {
  return {
    selections: parseSelectionsRoot(input.selections),
    toggleTotals: {},
  };
}

/** Shallow copy for RMW — skips full re-parse (bundle already came from sanitized cache or disk read). */
function cloneTrustedBundle(bundle: HabitPersistBundle): HabitPersistBundle {
  const selections: HabitSelectionsRecord = {};
  for (const [k, ids] of Object.entries(bundle.selections)) {
    if (ids.length > 0) selections[k] = ids.slice();
  }
  return { selections, toggleTotals: {} };
}

async function quarantineCorruptValue(rawJson: string): Promise<void> {
  const ts = Date.now();
  try {
    await quarantineRawHabitSelectionsJson(rawJson, `${CORRUPT_PREFIX}${ts}`);
  } catch (e) {
    logger.warn('storage.habitSelections.corruptBackup.persistFailed', { error: e });
    logger.error('storage.habitSelections.corruptReset.failed', { error: e });
  }
}

async function readFromDisk(): Promise<HabitPersistBundle> {
  await ensureLocalPersistenceReady();
  const json = await loadHabitSelectionsJsonFromDisk();
  const parsed = safeParse(json);
  if (parsed.corrupt && typeof json === 'string' && json.length > 0) {
    logger.warn('storage.habitSelections.corrupt.detected', { action: 'quarantineAndReset' });
    await quarantineCorruptValue(json);
    return { selections: {}, toggleTotals: {} };
  }
  const bundle = sanitizeBundle(parsed.bundle);
  if (parsed.shouldMigrateToCanonicalDisk && typeof json === 'string' && json.length > 0) {
    try {
      await ensureLocalPersistenceReady();
      assertLocalPersistenceWritable();
      await persistHabitSelectionsJsonToDisk(serializeCanonicalSelections(bundle.selections), bundle.selections);
    } catch (e) {
      logger.warn('storage.habitSelections.migrateToV3Disk.failed', { error: e });
    }
  }
  return bundle;
}

async function getBundle(): Promise<HabitPersistBundle> {
  try {
    if (cache) return cache;
    await ensureLocalPersistenceReady();
    if (loadPromise) return loadPromise;

    const generationAtStart = cacheGeneration;
    loadPromise = readFromDisk().then((next) => {
      if (cacheGeneration === generationAtStart) cache = next;
      return next;
    });
    const res = await loadPromise;
    loadPromise = null;
    return res;
  } catch (e) {
    loadPromise = null;
    logger.warn('storage.habitSelections.load.failed', { error: e });
    return { selections: {}, toggleTotals: {} };
  }
}

async function getMutableBundleForWrite(): Promise<HabitPersistBundle> {
  if (cache) return cloneTrustedBundle(cache);
  if (loadPromise) return cloneTrustedBundle(await loadPromise);
  return cloneTrustedBundle(await readFromDisk());
}

async function persistBundle(next: HabitPersistBundle): Promise<void> {
  await ensureLocalPersistenceReady();
  assertLocalPersistenceWritable();
  const safe = sanitizeBundle(next);
  await persistHabitSelectionsJsonToDisk(serializeCanonicalSelections(safe.selections), safe.selections);
  cacheGeneration += 1;
  loadPromise = null;
  cache = safe;
  notifyHabitSelectionsChanged(safe.selections);
}

export async function getHabitSelectionsForDate(date: string): Promise<HabitId[]> {
  if (!isValidISODateKey(date)) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      throw new Error(`[habitSelectionsStorage] Invalid date key: ${String(date)}`);
    }
    return [];
  }
  const all = await getBundle();
  const raw = all.selections[date];
  return raw && raw.length > 0 ? orderHabitIdsForPersist(raw) : [];
}

/** Distinct local days per habit where that habit is currently marked on in `selections`. */
export async function getHabitMarkedDayCounts(): Promise<HabitMarkedDayCountsRecord> {
  const all = await getBundle();
  return deriveMarkedDayCountsFromSelections(all.selections);
}

export async function toggleHabitForDate(date: string, habitId: HabitId): Promise<HabitToggleResult> {
  if (!isValidISODateKey(date)) {
    throw new Error(`[habitSelectionsStorage] Invalid date key: ${String(date)}`);
  }
  if (!isHabitId(habitId)) {
    throw new Error(`[habitSelectionsStorage] Invalid habit id: ${String(habitId)}`);
  }

  return withWriteLock(async () => {
    const all = await getMutableBundleForWrite();
    const base = all.selections[date] ?? [];
    const had = base.includes(habitId);
    const next = had
      ? orderHabitIdsForPersist(base.filter((id) => id !== habitId))
      : orderHabitIdsForPersist([...base, habitId]);
    if (next.length === 0) delete all.selections[date];
    else all.selections[date] = next;
    const markedDayCounts = deriveMarkedDayCountsFromSelections(all.selections);
    try {
      await persistBundle(all);
    } catch (error) {
      logger.error('storage.habitSelections.toggle.failed', { error });
      throw error;
    }
    return { habitIdsForDate: next.slice(), markedDayCounts };
  });
}

/** Remove one habit from a single day’s selection (e.g. when it’s hidden from Today). */
export async function removeHabitFromDate(date: string, habitId: HabitId): Promise<HabitId[]> {
  if (!isValidISODateKey(date)) {
    throw new Error(`[habitSelectionsStorage] Invalid date key: ${String(date)}`);
  }
  if (!isHabitId(habitId)) {
    throw new Error(`[habitSelectionsStorage] Invalid habit id: ${String(habitId)}`);
  }

  return withWriteLock(async () => {
    const all = await getMutableBundleForWrite();
    const current = [...(all.selections[date] ?? [])];
    if (!current.includes(habitId)) return current;
    const next = orderHabitIdsForPersist(current.filter((id) => id !== habitId));
    if (next.length === 0) delete all.selections[date];
    else all.selections[date] = next;
    try {
      await persistBundle(all);
    } catch (error) {
      logger.error('storage.habitSelections.removeOne.failed', { error });
      throw error;
    }
    return [...next];
  });
}

/**
 * Clear all per-day habit selections (e.g. alongside “Clear all data”).
 */
export async function clearAllHabitSelections(): Promise<void> {
  return withWriteLock(async () => {
    try {
      await ensureLocalPersistenceReady();
      assertLocalPersistenceWritable();
      await clearHabitSelectionsOnDisk();
      cacheGeneration += 1;
      loadPromise = null;
      cache = { selections: {}, toggleTotals: {} };
    } catch (error) {
      logger.error('storage.habitSelections.clear.failed', { error });
      throw error;
    }
  });
}

/** Dev-only: replace all per-day habit selections in one write (toggle counts reset). */
export async function setAllHabitSelectionsRecord(next: HabitSelectionsRecord): Promise<void> {
  return withWriteLock(async () => {
    try {
      const safeSelections = parseSelectionsRoot(next);
      await ensureLocalPersistenceReady();
      assertLocalPersistenceWritable();
      await persistHabitSelectionsJsonToDisk(serializeCanonicalSelections(safeSelections), safeSelections);
      cacheGeneration += 1;
      loadPromise = null;
      cache = { selections: safeSelections, toggleTotals: {} };
    } catch (error) {
      logger.error('storage.habitSelections.setAll.failed', { error });
      throw error;
    }
  });
}

/**
 * Read-only snapshot of all per-day habit selections for composed read models (e.g. Daily Activity range).
 * Shallow-cloned day arrays — **do not mutate**; writes go through `toggleHabitForDate` / `removeHabitFromDate`.
 */
export async function getHabitSelectionsRecordSnapshot(): Promise<HabitSelectionsRecord> {
  try {
    const b = await getBundle();
    const out: HabitSelectionsRecord = {};
    for (const [k, v] of Object.entries(b.selections)) {
      if (!isValidISODateKey(k)) continue;
      if (!Array.isArray(v) || v.length === 0) continue;
      out[k] = orderHabitIdsForPersist(v as HabitId[]);
    }
    return out;
  } catch (e) {
    logger.warn('storage.habitSelections.snapshotRead.failed', { error: e });
    return {};
  }
}

/** Clears in-memory session state for unit tests (`jest.resetModules` alternative when only this store must reset). */
export function resetHabitSelectionsStorageSessionStateForTests(): void {
  invalidateHabitSelectionsSessionCache();
}

export function invalidateHabitSelectionsSessionCache(): void {
  cache = null;
  loadPromise = null;
  cacheGeneration = 0;
  writeTail = Promise.resolve();
}


/** Sync read from warmed selections bundle. */
export function peekHabitSelectionsForDateFromSessionCache(date: string): HabitId[] | undefined {
  if (!isValidISODateKey(date)) return [];
  if (!cache) return undefined;
  const raw = cache.selections[date];
  return raw && raw.length > 0 ? orderHabitIdsForPersist(raw) : [];
}

/** Session write generation — stable across tab switches until selections mutate. */
export function getHabitSelectionsCacheGeneration(): number {
  return cacheGeneration;
}
