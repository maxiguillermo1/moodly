/**
 * @fileoverview SQLite meta helpers + entries backend resolution.
 * @module data/persistence/sqlite/storageBackend
 */

import type { KeyValueStore } from '../keyValueStore';
import { ensureMoodlySqliteReady } from './database';
import type { MoodlySqliteDatabase } from './databaseTypes';
import { countMoodEntries, importMoodEntriesToSqlite } from './moodEntriesStore';
import {
  SQL_META_ENTRIES_BACKEND,
  SQL_META_ENTRIES_IMPORTED,
} from './schemaConstants';
import { safeParseEntriesForImport } from './importFromAsyncStorage';

export type MoodEntriesBackendKind = 'async' | 'sqlite';

const ENTRIES_STORAGE_KEY = 'moodly.entries';
const BACKEND_FLAG_KEY = 'moodly.entries.backend';

let resolvedBackend: MoodEntriesBackendKind | null = null;

function forcedBackendFromEnv(): MoodEntriesBackendKind | null {
  if (typeof process === 'undefined') return null;
  const v = process.env.MOODLY_ENTRIES_BACKEND;
  if (v === 'async' || v === 'sqlite') return v;
  return null;
}

async function readMeta(db: MoodlySqliteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM moodly_meta WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

async function writeMeta(db: MoodlySqliteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO moodly_meta (key, value) VALUES (?, ?)', key, value);
}

export async function resolveMoodEntriesBackend(store: KeyValueStore): Promise<MoodEntriesBackendKind> {
  const forced = forcedBackendFromEnv();
  if (forced) {
    resolvedBackend = forced;
    return forced;
  }

  if (resolvedBackend) return resolvedBackend;

  const flag = await store.getItem(BACKEND_FLAG_KEY);
  if (flag === 'sqlite') {
    resolvedBackend = 'sqlite';
    return 'sqlite';
  }

  try {
    const db = await ensureMoodlySqliteReady();
    const backendMeta = await readMeta(db, SQL_META_ENTRIES_BACKEND);
    if (backendMeta === 'sqlite') {
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

/**
 * One-shot import: legacy AsyncStorage `moodly.entries` → SQLite `mood_entries`.
 * Idempotent when meta flag is already set.
 */
export async function ensureMoodEntriesImportedFromAsyncStorage(store: KeyValueStore): Promise<void> {
  const forced = forcedBackendFromEnv();
  if (forced === 'async') return;

  let db: MoodlySqliteDatabase;
  try {
    db = await ensureMoodlySqliteReady();
  } catch {
    return;
  }

  const importedFlag = await readMeta(db, SQL_META_ENTRIES_IMPORTED);
  if (importedFlag === '1') {
    await writeMeta(db, SQL_META_ENTRIES_BACKEND, 'sqlite');
    await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
    resolvedBackend = 'sqlite';
    return;
  }

  const sqliteCount = await countMoodEntries(db);
  if (sqliteCount > 0) {
    await writeMeta(db, SQL_META_ENTRIES_IMPORTED, '1');
    await writeMeta(db, SQL_META_ENTRIES_BACKEND, 'sqlite');
    await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
    resolvedBackend = 'sqlite';
    return;
  }

  const raw = await store.getItem(ENTRIES_STORAGE_KEY);
  if (!raw) {
    await writeMeta(db, SQL_META_ENTRIES_IMPORTED, '1');
    await writeMeta(db, SQL_META_ENTRIES_BACKEND, 'sqlite');
    await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
    resolvedBackend = 'sqlite';
    return;
  }

  const record = safeParseEntriesForImport(raw);
  if (Object.keys(record).length > 0) {
    await importMoodEntriesToSqlite(db, record);
  }

  await writeMeta(db, SQL_META_ENTRIES_IMPORTED, '1');
  await writeMeta(db, SQL_META_ENTRIES_BACKEND, 'sqlite');
  await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
  resolvedBackend = 'sqlite';
}

export function resetMoodEntriesBackendCacheForTests(): void {
  resolvedBackend = null;
}

export async function isMoodEntriesSqliteActive(store: KeyValueStore): Promise<boolean> {
  return (await resolveMoodEntriesBackend(store)) === 'sqlite';
}
