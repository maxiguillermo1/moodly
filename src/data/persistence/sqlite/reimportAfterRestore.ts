/**
 * @fileoverview Force SQLite domains to re-import from AsyncStorage kv after restore.
 * @module data/persistence/sqlite/reimportAfterRestore
 */

import type { KeyValueStore } from '../keyValueStore';
import { ensureKairoSqliteReady } from './database';
import { clearMoodEntriesSqlite } from './moodEntriesStore';
import { resetGoalsBackendCacheForTests, ensureGoalsImportedFromAsyncStorage } from './goalsStorageBackend';
import { resetGoalsSqliteImportState } from './goalsStorageBackend';
import { resetHabitSelectionsBackendCacheForTests, ensureHabitSelectionsImportedFromAsyncStorage } from './habitsStorageBackend';
import { resetHabitSelectionsSqliteImportState } from './habitsStorageBackend';
import { resetMoodEntriesBackendCacheForTests, ensureMoodEntriesImportedFromAsyncStorage } from './storageBackend';
import { deleteSqliteMeta } from './sqliteMeta';
import {
  SQL_META_ENTRIES_BACKEND,
  SQL_META_ENTRIES_IMPORTED,
  SQL_META_GOALS_BACKEND,
  SQL_META_GOALS_IMPORTED,
  SQL_META_HABITS_BACKEND,
  SQL_META_HABITS_IMPORTED,
} from './schemaConstants';

const BACKEND_FLAGS = [
  'kairo.entries.backend',
  'kairo.habitSelections.backend',
  'kairo.goals.backend',
] as const;

export async function forceReimportAllSqliteFromAsyncStorage(store: KeyValueStore): Promise<void> {
  let db;
  try {
    db = await ensureKairoSqliteReady();
  } catch {
    return;
  }

  await clearMoodEntriesSqlite(db);
  await deleteSqliteMeta(db, SQL_META_ENTRIES_IMPORTED);
  await deleteSqliteMeta(db, SQL_META_ENTRIES_BACKEND);
  await resetHabitSelectionsSqliteImportState(db);
  await resetGoalsSqliteImportState(db);
  await deleteSqliteMeta(db, SQL_META_HABITS_IMPORTED);
  await deleteSqliteMeta(db, SQL_META_HABITS_BACKEND);
  await deleteSqliteMeta(db, SQL_META_GOALS_IMPORTED);
  await deleteSqliteMeta(db, SQL_META_GOALS_BACKEND);

  for (const key of BACKEND_FLAGS) {
    await store.removeItem(key);
  }

  resetMoodEntriesBackendCacheForTests();
  resetHabitSelectionsBackendCacheForTests();
  resetGoalsBackendCacheForTests();

  await ensureMoodEntriesImportedFromAsyncStorage(store);
  await ensureHabitSelectionsImportedFromAsyncStorage(store);
  await ensureGoalsImportedFromAsyncStorage(store);
}
