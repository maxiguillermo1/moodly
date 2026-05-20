/**
 * @fileoverview Which catalog habits appear as chips on Today (separate from per-day completion).
 * @module data/storage/habitTrackingStorage
 *
 * Key: `kairo.trackedHabits`
 * Value: `HabitId[]` — unique, catalog order preserved; empty means no Today chips.
 */

import { HABIT_IDS, isHabitId, type HabitId } from '../../lib/constants/habitsCatalog';
import { logger } from '../../lib/security/logger';
import { assertLocalPersistenceWritable, ensureLocalPersistenceReady } from '../persistence/bootstrap';
import { notifyTrackedHabitsChanged } from '../sync/syncBridge';
import { storage } from './asyncStorage';

const STORAGE_KEY = 'kairo.trackedHabits';
const CORRUPT_PREFIX = `${STORAGE_KEY}.corrupt.`;

const DEFAULT_TRACKED: HabitId[] = [...HABIT_IDS];

let cache: HabitId[] | null = null;
let loadPromise: Promise<HabitId[]> | null = null;
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

function normalizeTrackedIds(raw: unknown): HabitId[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const out: HabitId[] = [];
  for (const x of raw) {
    if (typeof x !== 'string' || !isHabitId(x) || seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

/** Enforce catalog order; drop unknown ids. */
function orderLikeCatalog(ids: HabitId[]): HabitId[] {
  const set = new Set(ids);
  return HABIT_IDS.filter((id) => set.has(id));
}

type ParseResult = { ids: HabitId[]; corrupt: boolean };

function safeParse(json: string | null): ParseResult {
  if (!json) return { ids: [...DEFAULT_TRACKED], corrupt: false };
  try {
    const parsed = JSON.parse(json) as unknown;
    const normalized = normalizeTrackedIds(parsed);
    if (!normalized) return { ids: [...DEFAULT_TRACKED], corrupt: true };
    const ordered = orderLikeCatalog(normalized);
    return { ids: ordered.length > 0 ? ordered : [], corrupt: false };
  } catch {
    return { ids: [...DEFAULT_TRACKED], corrupt: true };
  }
}

async function quarantineCorruptValue(rawJson: string): Promise<void> {
  const ts = Date.now();
  try {
    await storage.setItem(`${CORRUPT_PREFIX}${ts}`, rawJson);
  } catch (e) {
    logger.warn('storage.trackedHabits.corruptBackup.persistFailed', { error: e });
  }
  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TRACKED));
  } catch (e) {
    logger.error('storage.trackedHabits.corruptReset.failed', { error: e });
  }
}

async function readFromDisk(): Promise<HabitId[]> {
  await ensureLocalPersistenceReady();
  const json = await storage.getItem(STORAGE_KEY);
  const parsed = safeParse(json);
  if (parsed.corrupt && typeof json === 'string' && json.length > 0) {
    logger.warn('storage.trackedHabits.corrupt.detected', { action: 'quarantineAndReset' });
    await quarantineCorruptValue(json);
  }
  return parsed.ids;
}

export async function getTrackedHabitIds(): Promise<HabitId[]> {
  try {
    if (cache) return [...cache];
    await ensureLocalPersistenceReady();
    if (loadPromise) return loadPromise;
    const generationAtStart = cacheGeneration;
    loadPromise = readFromDisk().then((next) => {
      if (cacheGeneration === generationAtStart) cache = next;
      return [...next];
    });
    const res = await loadPromise;
    loadPromise = null;
    return res;
  } catch (e) {
    loadPromise = null;
    logger.warn('storage.trackedHabits.load.failed', { error: e });
    return [...DEFAULT_TRACKED];
  }
}

async function persistTracked(next: HabitId[]): Promise<void> {
  await ensureLocalPersistenceReady();
  assertLocalPersistenceWritable();
  await storage.setItem(STORAGE_KEY, JSON.stringify(next));
  cacheGeneration += 1;
  loadPromise = null;
  cache = [...next];
  notifyTrackedHabitsChanged(next);
}

export async function setTrackedHabitIds(ids: HabitId[]): Promise<void> {
  const ordered = orderLikeCatalog(Array.from(new Set(ids)));
  return withWriteLock(async () => {
    try {
      await persistTracked(ordered);
    } catch (error) {
      logger.error('storage.trackedHabits.set.failed', { error });
      throw error;
    }
  });
}

/** Reset to defaults (e.g. after “Clear all data”). */
export async function resetTrackedHabitsToDefaults(): Promise<void> {
  return withWriteLock(async () => {
    try {
      await persistTracked([...DEFAULT_TRACKED]);
    } catch (error) {
      logger.error('storage.trackedHabits.reset.failed', { error });
      throw error;
    }
  });
}

/** Test helper: drop in-memory caches so AsyncStorage.clear() reflects cold reads. */
export function resetHabitTrackingStorageSessionStateForTests(): void {
  cache = null;
  loadPromise = null;
  cacheGeneration = 0;
  writeTail = Promise.resolve();
}
