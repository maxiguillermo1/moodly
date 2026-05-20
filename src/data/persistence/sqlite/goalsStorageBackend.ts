/**
 * @fileoverview SQLite meta + import for goals.
 * @module data/persistence/sqlite/goalsStorageBackend
 */

import type { GoalsRecord } from '../../../types';
import type { KeyValueStore } from '../keyValueStore';
import { ensureMoodlySqliteReady } from './database';
import type { MoodlySqliteDatabase } from './databaseTypes';
import { countGoalsSqlite, importGoalsRecordToSqlite } from './goalsStore';
import { readSqliteMeta, writeSqliteMeta } from './sqliteMeta';
import { SQL_META_GOALS_BACKEND, SQL_META_GOALS_IMPORTED } from './schemaConstants';

export type GoalsBackendKind = 'async' | 'sqlite';

const GOALS_STORAGE_KEY = 'moodly.goals';
const BACKEND_FLAG_KEY = 'moodly.goals.backend';

let resolvedBackend: GoalsBackendKind | null = null;

export function resetGoalsBackendCacheForTests(): void {
  resolvedBackend = null;
}

export async function resolveGoalsBackend(store: KeyValueStore): Promise<GoalsBackendKind> {
  if (resolvedBackend) return resolvedBackend;
  const flag = await store.getItem(BACKEND_FLAG_KEY);
  if (flag === 'sqlite') {
    resolvedBackend = 'sqlite';
    return 'sqlite';
  }
  try {
    const db = await ensureMoodlySqliteReady();
    if ((await readSqliteMeta(db, SQL_META_GOALS_BACKEND)) === 'sqlite') {
      await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
      resolvedBackend = 'sqlite';
      return 'sqlite';
    }
  } catch {
    resolvedBackend = 'async';
    return 'async';
  }
  resolvedBackend = 'async';
  return 'async';
}

function parseGoalsForImport(raw: string | null): GoalsRecord | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoalsRecord;
  } catch {
    return null;
  }
}

export async function ensureGoalsImportedFromAsyncStorage(store: KeyValueStore): Promise<void> {
  let db: MoodlySqliteDatabase;
  try {
    db = await ensureMoodlySqliteReady();
  } catch {
    return;
  }

  if ((await readSqliteMeta(db, SQL_META_GOALS_IMPORTED)) === '1') {
    await writeSqliteMeta(db, SQL_META_GOALS_BACKEND, 'sqlite');
    await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
    resolvedBackend = 'sqlite';
    return;
  }

  if ((await countGoalsSqlite(db)) > 0) {
    await writeSqliteMeta(db, SQL_META_GOALS_IMPORTED, '1');
    await writeSqliteMeta(db, SQL_META_GOALS_BACKEND, 'sqlite');
    await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
    resolvedBackend = 'sqlite';
    return;
  }

  const raw = await store.getItem(GOALS_STORAGE_KEY);
  const record = parseGoalsForImport(raw);
  if (record && Object.keys(record.goalsById ?? {}).length > 0) {
    await importGoalsRecordToSqlite(db, record);
  }

  await writeSqliteMeta(db, SQL_META_GOALS_IMPORTED, '1');
  await writeSqliteMeta(db, SQL_META_GOALS_BACKEND, 'sqlite');
  await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
  resolvedBackend = 'sqlite';
}

export async function resetGoalsSqliteImportState(db: MoodlySqliteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM goal_progress');
  await db.runAsync('DELETE FROM goals');
  await writeSqliteMeta(db, SQL_META_GOALS_IMPORTED, '0');
  await writeSqliteMeta(db, SQL_META_GOALS_BACKEND, '');
}
