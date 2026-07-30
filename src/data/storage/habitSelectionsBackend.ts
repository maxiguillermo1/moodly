/**
 * @fileoverview Habit selections persistence adapter (AsyncStorage legacy vs SQLite).
 * @module data/storage/habitSelectionsBackend
 */

import { getDefaultLocalKeyValueStore } from '../persistence/localStore';
import { ensureKairoSqliteReady } from '../persistence/sqlite/database';
import {
  clearHabitSelectionsSqlite,
  loadHabitSelectionsFromSqlite,
  persistHabitSelectionsToSqlite,
} from '../persistence/sqlite/habitSelectionsStore';
import { resolveHabitSelectionsBackend } from '../persistence/sqlite/habitsStorageBackend';
import { withKairoSqliteWriteLock } from '../persistence/sqlite/sqliteWriteLock';
import { storage } from './asyncStorage';
import type { HabitSelectionsRecord } from './habitSelectionsTypes';

export const HABIT_SELECTIONS_STORAGE_KEY = 'kairo.habitSelections';

async function usesSqlite(): Promise<boolean> {
  const store = getDefaultLocalKeyValueStore();
  return (await resolveHabitSelectionsBackend(store)) === 'sqlite';
}

export async function loadHabitSelectionsJsonFromDisk(): Promise<string | null> {
  if (await usesSqlite()) {
    const db = await ensureKairoSqliteReady();
    const selections = await loadHabitSelectionsFromSqlite(db);
    return JSON.stringify({ v: 3, selections, toggleTotals: {} });
  }
  return storage.getItem(HABIT_SELECTIONS_STORAGE_KEY);
}

export async function persistHabitSelectionsJsonToDisk(json: string, selections: HabitSelectionsRecord): Promise<void> {
  if (await usesSqlite()) {
    const db = await ensureKairoSqliteReady();
    await persistHabitSelectionsToSqlite(db, selections);
    return;
  }
  await storage.setItem(HABIT_SELECTIONS_STORAGE_KEY, json);
}

export async function clearHabitSelectionsOnDisk(): Promise<void> {
  if (await usesSqlite()) {
    const db = await ensureKairoSqliteReady();
    await withKairoSqliteWriteLock(async () => {
      await clearHabitSelectionsSqlite(db);
    });
    return;
  }
  await storage.removeItem(HABIT_SELECTIONS_STORAGE_KEY);
}

export async function quarantineRawHabitSelectionsJson(rawJson: string, backupKey: string): Promise<void> {
  await storage.setItem(backupKey, rawJson);
  if (await usesSqlite()) {
    const db = await ensureKairoSqliteReady();
    await withKairoSqliteWriteLock(async () => {
      await clearHabitSelectionsSqlite(db);
    });
    return;
  }
  await storage.setItem(HABIT_SELECTIONS_STORAGE_KEY, JSON.stringify({ v: 3, selections: {}, toggleTotals: {} }));
}
