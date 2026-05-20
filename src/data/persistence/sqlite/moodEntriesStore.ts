/**
 * @fileoverview Normalized mood_entries CRUD (SQLite backend).
 * @module data/persistence/sqlite/moodEntriesStore
 */

import type { MoodEntriesRecord, MoodEntry, MoodGrade } from '../../../types';
import { isValidISODateKey, VALID_MOOD_SET } from '../../model/entry';
import type { MoodlySqliteDatabase } from './databaseTypes';

type MoodEntryRow = {
  date: string;
  mood: string;
  note: string;
  created_at_ms: number;
  updated_at_ms: number;
};

function rowToEntry(row: MoodEntryRow): MoodEntry | null {
  if (!isValidISODateKey(row.date)) return null;
  if (!VALID_MOOD_SET.has(row.mood as MoodGrade)) return null;
  if (!Number.isFinite(row.created_at_ms) || !Number.isFinite(row.updated_at_ms)) return null;
  return {
    date: row.date,
    mood: row.mood as MoodGrade,
    note: typeof row.note === 'string' ? row.note : '',
    createdAt: row.created_at_ms,
    updatedAt: row.updated_at_ms,
  };
}

export async function countMoodEntries(db: MoodlySqliteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM mood_entries');
  return row?.cnt ?? 0;
}

export async function loadAllMoodEntriesFromSqlite(db: MoodlySqliteDatabase): Promise<MoodEntriesRecord> {
  const rows = await db.getAllAsync<MoodEntryRow>('SELECT * FROM mood_entries');
  const out: MoodEntriesRecord = {};
  for (const row of rows) {
    const entry = rowToEntry(row);
    if (entry) out[entry.date] = entry;
  }
  return out;
}

export async function upsertMoodEntrySqlite(db: MoodlySqliteDatabase, entry: MoodEntry): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO mood_entries (date, mood, note, created_at_ms, updated_at_ms)
     VALUES (?, ?, ?, ?, ?)`,
    entry.date,
    entry.mood,
    entry.note,
    entry.createdAt,
    entry.updatedAt
  );
}

export async function deleteMoodEntrySqlite(db: MoodlySqliteDatabase, date: string): Promise<void> {
  await db.runAsync('DELETE FROM mood_entries WHERE date = ?', date);
}

export async function clearMoodEntriesSqlite(db: MoodlySqliteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM mood_entries');
}

export async function importMoodEntriesToSqlite(
  db: MoodlySqliteDatabase,
  record: MoodEntriesRecord
): Promise<number> {
  let imported = 0;
  await db.withTransactionAsync(async () => {
    for (const entry of Object.values(record)) {
      if (!entry) continue;
      const normalized = rowToEntry({
        date: entry.date,
        mood: entry.mood,
        note: entry.note,
        created_at_ms: entry.createdAt,
        updated_at_ms: entry.updatedAt,
      });
      if (!normalized) continue;
      await upsertMoodEntrySqlite(db, normalized);
      imported += 1;
    }
  });
  return imported;
}
