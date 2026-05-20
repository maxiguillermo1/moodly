/**
 * @fileoverview User export builder — merges SQLite mood rows into the local export envelope.
 * @module data/persistence/localExport/buildUserExport
 */

import type { MoodEntriesRecord } from '../../../types';
import { getDefaultLocalKeyValueStore } from '../localStore';
import { ensureKairoSqliteReady } from '../sqlite/database';
import { loadHabitSelectionsFromSqlite } from '../sqlite/habitSelectionsStore';
import { resolveHabitSelectionsBackend } from '../sqlite/habitsStorageBackend';
import { loadGoalsRecordFromSqlite } from '../sqlite/goalsStore';
import { resolveGoalsBackend } from '../sqlite/goalsStorageBackend';
import { loadAllMoodEntriesFromSqlite } from '../sqlite/moodEntriesStore';
import { isMoodEntriesSqliteActive } from '../sqlite/storageBackend';
import {
  buildKairoLocalExportV1,
  serializeKairoLocalExport,
  type KairoLocalExportV1,
} from './kairoLocalExport';

const ENTRIES_KEY = 'kairo.entries';
const HABITS_KEY = 'kairo.habitSelections';
const GOALS_KEY = 'kairo.goals';

async function snapshotMoodEntriesForExportKv(): Promise<string | null> {
  const store = getDefaultLocalKeyValueStore();
  if (!(await isMoodEntriesSqliteActive(store))) {
    return store.getItem(ENTRIES_KEY);
  }
  try {
    const db = await ensureKairoSqliteReady();
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
    const db = await ensureKairoSqliteReady();
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
    const db = await ensureKairoSqliteReady();
    const record = await loadGoalsRecordFromSqlite(db);
    return JSON.stringify(record);
  } catch {
    return store.getItem(GOALS_KEY);
  }
}

/** Builds a portable export envelope including SQLite-backed domains in `kv`. */
export async function buildKairoUserExportV1(): Promise<KairoLocalExportV1> {
  const store = getDefaultLocalKeyValueStore();
  if (typeof store.getAllKeys !== 'function') {
    throw new Error('[buildKairoUserExportV1] KeyValueStore.getAllKeys is required');
  }
  const payload = await buildKairoLocalExportV1(store as typeof store & { getAllKeys: () => Promise<readonly string[]> });
  const kv = { ...payload.kv };
  const entriesJson = await snapshotMoodEntriesForExportKv();
  if (entriesJson != null) kv[ENTRIES_KEY] = entriesJson;
  const habitsJson = await snapshotHabitSelectionsForExportKv();
  if (habitsJson != null) kv[HABITS_KEY] = habitsJson;
  const goalsJson = await snapshotGoalsForExportKv();
  if (goalsJson != null) kv[GOALS_KEY] = goalsJson;
  return { ...payload, kv };
}

export async function buildKairoUserExportJson(): Promise<string> {
  const payload = await buildKairoUserExportV1();
  return serializeKairoLocalExport(payload);
}
