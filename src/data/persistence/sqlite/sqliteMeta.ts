/**
 * @fileoverview Shared SQLite moodly_meta helpers.
 * @module data/persistence/sqlite/sqliteMeta
 */

import type { MoodlySqliteDatabase } from './databaseTypes';

export async function readSqliteMeta(db: MoodlySqliteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM moodly_meta WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function writeSqliteMeta(db: MoodlySqliteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO moodly_meta (key, value) VALUES (?, ?)', key, value);
}

export async function deleteSqliteMeta(db: MoodlySqliteDatabase, key: string): Promise<void> {
  await db.runAsync('DELETE FROM moodly_meta WHERE key = ?', key);
}
