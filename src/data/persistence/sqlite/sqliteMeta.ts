/**
 * @fileoverview Shared SQLite kairo_meta helpers.
 * @module data/persistence/sqlite/sqliteMeta
 */

import type { KairoSqliteDatabase } from './databaseTypes';

export async function readSqliteMeta(db: KairoSqliteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM kairo_meta WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function writeSqliteMeta(db: KairoSqliteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO kairo_meta (key, value) VALUES (?, ?)', key, value);
}

export async function deleteSqliteMeta(db: KairoSqliteDatabase, key: string): Promise<void> {
  await db.runAsync('DELETE FROM kairo_meta WHERE key = ?', key);
}
