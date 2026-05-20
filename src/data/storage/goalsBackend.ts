/**
 * @fileoverview Goals persistence adapter (AsyncStorage legacy vs SQLite).
 * @module data/storage/goalsBackend
 */

import type { GoalsRecord } from '../../types';
import { getDefaultLocalKeyValueStore } from '../persistence/localStore';
import { ensureMoodlySqliteReady } from '../persistence/sqlite/database';
import {
  clearGoalsSqlite,
  loadGoalsRecordFromSqlite,
  persistGoalsRecordToSqlite,
} from '../persistence/sqlite/goalsStore';
import { resolveGoalsBackend } from '../persistence/sqlite/goalsStorageBackend';
import { storage } from './asyncStorage';

export const GOALS_STORAGE_KEY = 'moodly.goals';

async function usesSqlite(): Promise<boolean> {
  const store = getDefaultLocalKeyValueStore();
  return (await resolveGoalsBackend(store)) === 'sqlite';
}

export async function loadGoalsJsonFromDisk(): Promise<string | null> {
  if (await usesSqlite()) {
    const db = await ensureMoodlySqliteReady();
    const record = await loadGoalsRecordFromSqlite(db);
    return JSON.stringify(record);
  }
  return storage.getItem(GOALS_STORAGE_KEY);
}

export async function persistGoalsRecordToDisk(record: GoalsRecord): Promise<void> {
  if (await usesSqlite()) {
    const db = await ensureMoodlySqliteReady();
    await persistGoalsRecordToSqlite(db, record);
    return;
  }
  await storage.setItem(GOALS_STORAGE_KEY, JSON.stringify(record));
}

export async function clearGoalsOnDisk(): Promise<void> {
  if (await usesSqlite()) {
    const db = await ensureMoodlySqliteReady();
    await clearGoalsSqlite(db);
    return;
  }
  await storage.removeItem(GOALS_STORAGE_KEY);
}

export async function quarantineRawGoalsJson(rawJson: string, backupKey: string, fallbackJson: string): Promise<void> {
  await storage.setItem(backupKey, rawJson);
  if (await usesSqlite()) {
    const db = await ensureMoodlySqliteReady();
    await clearGoalsSqlite(db);
    return;
  }
  await storage.setItem(GOALS_STORAGE_KEY, fallbackJson);
}
