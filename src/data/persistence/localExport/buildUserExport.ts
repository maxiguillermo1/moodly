/**
 * @fileoverview User export builder — merges SQLite mood rows into the local export envelope.
 * @module data/persistence/localExport/buildUserExport
 */

import type { MoodEntriesRecord } from '../../../types';
import { getDefaultLocalKeyValueStore } from '../localStore';
import { ensureMoodlySqliteReady } from '../sqlite/database';
import { loadHabitSelectionsFromSqlite } from '../sqlite/habitSelectionsStore';
import { resolveHabitSelectionsBackend } from '../sqlite/habitsStorageBackend';
import { loadGoalsRecordFromSqlite } from '../sqlite/goalsStore';
import { resolveGoalsBackend } from '../sqlite/goalsStorageBackend';
import { loadAllMoodEntriesFromSqlite } from '../sqlite/moodEntriesStore';
import { isMoodEntriesSqliteActive } from '../sqlite/storageBackend';
import {
  buildMoodlyLocalExportV1,
  serializeMoodlyLocalExport,
  type MoodlyLocalExportV1,
} from './moodlyLocalExport';

const ENTRIES_KEY = 'moodly.entries';
const HABITS_KEY = 'moodly.habitSelections';
const GOALS_KEY = 'moodly.goals';

async function snapshotMoodEntriesForExportKv(): Promise<string | null> {
  const store = getDefaultLocalKeyValueStore();
  if (!(await isMoodEntriesSqliteActive(store))) {
    return store.getItem(ENTRIES_KEY);
  }
  try {
    const db = await ensureMoodlySqliteReady();
    const record: MoodEntriesRecord = await loadAllMoodEntriesFromSqlite(db);
    return JSON.stringify(record);
  } catch {
    return store.getItem(ENTRIES_KEY);
  }
}

async function snapshotHabitSelectionsForExportKv(): Promise<string | null> {
  const store = getDefaultLocalKeyValueStore();
  if ((await resolveHabitSelectionsBackend(store)) !== 'sqlite') {
    return store.getItem(HABITS_KEY);
  }
  try {
    const db = await ensureMoodlySqliteReady();
    const selections = await loadHabitSelectionsFromSqlite(db);
    return JSON.stringify({ v: 3, selections, toggleTotals: {} });
  } catch {
    return store.getItem(HABITS_KEY);
  }
}

async function snapshotGoalsForExportKv(): Promise<string | null> {
  const store = getDefaultLocalKeyValueStore();
  if ((await resolveGoalsBackend(store)) !== 'sqlite') {
    return store.getItem(GOALS_KEY);
  }
  try {
    const db = await ensureMoodlySqliteReady();
    const record = await loadGoalsRecordFromSqlite(db);
    return JSON.stringify(record);
  } catch {
    return store.getItem(GOALS_KEY);
  }
}

/** Builds a portable export envelope including SQLite-backed domains in `kv`. */
export async function buildMoodlyUserExportV1(): Promise<MoodlyLocalExportV1> {
  const store = getDefaultLocalKeyValueStore();
  if (typeof store.getAllKeys !== 'function') {
    throw new Error('[buildMoodlyUserExportV1] KeyValueStore.getAllKeys is required');
  }
  const payload = await buildMoodlyLocalExportV1(store as typeof store & { getAllKeys: () => Promise<readonly string[]> });
  const kv = { ...payload.kv };
  const entriesJson = await snapshotMoodEntriesForExportKv();
  if (entriesJson != null) kv[ENTRIES_KEY] = entriesJson;
  const habitsJson = await snapshotHabitSelectionsForExportKv();
  if (habitsJson != null) kv[HABITS_KEY] = habitsJson;
  const goalsJson = await snapshotGoalsForExportKv();
  if (goalsJson != null) kv[GOALS_KEY] = goalsJson;
  return { ...payload, kv };
}

export async function buildMoodlyUserExportJson(): Promise<string> {
  const payload = await buildMoodlyUserExportV1();
  return serializeMoodlyLocalExport(payload);
}
