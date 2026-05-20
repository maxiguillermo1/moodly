/**
 * @fileoverview Mood entries persistence adapter (AsyncStorage legacy vs SQLite).
 * @module data/storage/moodEntriesBackend
 */

import type { MoodEntriesRecord, MoodEntry } from '../../types';
import { validateEntriesRecord } from '../model/entry';
import { getDefaultLocalKeyValueStore } from '../persistence/localStore';
import { ensureMoodlySqliteReady } from '../persistence/sqlite/database';
import {
  clearMoodEntriesSqlite,
  deleteMoodEntrySqlite,
  importMoodEntriesToSqlite,
  loadAllMoodEntriesFromSqlite,
  upsertMoodEntrySqlite,
} from '../persistence/sqlite/moodEntriesStore';
import { resolveMoodEntriesBackend } from '../persistence/sqlite/storageBackend';
import { storage } from './asyncStorage';

export const MOOD_ENTRIES_STORAGE_KEY = 'moodly.entries';

async function usesSqlite(): Promise<boolean> {
  const store = getDefaultLocalKeyValueStore();
  return (await resolveMoodEntriesBackend(store)) === 'sqlite';
}

export async function moodEntriesUsesSqlite(): Promise<boolean> {
  return usesSqlite();
}

export async function loadMoodEntriesFromDisk(): Promise<MoodEntriesRecord> {
  if (await usesSqlite()) {
    const db = await ensureMoodlySqliteReady();
    return loadAllMoodEntriesFromSqlite(db);
  }
  const json = await storage.getItem(MOOD_ENTRIES_STORAGE_KEY);
  if (!json) return {};
  try {
    const raw = JSON.parse(json) as unknown;
    return validateEntriesRecord(raw);
  } catch {
    return {};
  }
}

export async function persistMoodEntriesBlob(record: MoodEntriesRecord): Promise<void> {
  if (await usesSqlite()) {
    const db = await ensureMoodlySqliteReady();
    await clearMoodEntriesSqlite(db);
    await importMoodEntriesToSqlite(db, record);
    return;
  }
  await storage.setItem(MOOD_ENTRIES_STORAGE_KEY, JSON.stringify(record));
}

export async function persistMoodEntryRow(entry: MoodEntry, fullRecord: MoodEntriesRecord): Promise<void> {
  if (await usesSqlite()) {
    const db = await ensureMoodlySqliteReady();
    await upsertMoodEntrySqlite(db, entry);
    return;
  }
  await storage.setItem(MOOD_ENTRIES_STORAGE_KEY, JSON.stringify(fullRecord));
}

export async function deleteMoodEntryRow(date: string, fullRecord: MoodEntriesRecord): Promise<void> {
  if (await usesSqlite()) {
    const db = await ensureMoodlySqliteReady();
    await deleteMoodEntrySqlite(db, date);
    return;
  }
  await storage.setItem(MOOD_ENTRIES_STORAGE_KEY, JSON.stringify(fullRecord));
}

export async function clearMoodEntriesOnDisk(): Promise<void> {
  if (await usesSqlite()) {
    const db = await ensureMoodlySqliteReady();
    await clearMoodEntriesSqlite(db);
    return;
  }
  await storage.removeItem(MOOD_ENTRIES_STORAGE_KEY);
}

export async function readRawMoodEntriesJson(): Promise<string | null> {
  return storage.getItem(MOOD_ENTRIES_STORAGE_KEY);
}

export async function quarantineRawMoodEntriesJson(rawJson: string, backupKey: string): Promise<void> {
  await storage.setItem(backupKey, rawJson);
  if (await usesSqlite()) {
    const db = await ensureMoodlySqliteReady();
    await clearMoodEntriesSqlite(db);
    return;
  }
  await storage.setItem(MOOD_ENTRIES_STORAGE_KEY, JSON.stringify({}));
}
