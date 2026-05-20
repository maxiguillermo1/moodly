/**
 * @fileoverview SQLite habit_selections CRUD.
 * @module data/persistence/sqlite/habitSelectionsStore
 */

import type { HabitId } from '../../../lib/constants/habitsCatalog';
import { isHabitId } from '../../../lib/constants/habitsCatalog';
import { isValidISODateKey } from '../../model/entry';
import type { MoodlySqliteDatabase } from './databaseTypes';

export type HabitSelectionsSqliteRecord = Record<string, HabitId[]>;

type HabitRow = { date: string; habit_id: string };

export async function loadHabitSelectionsFromSqlite(db: MoodlySqliteDatabase): Promise<HabitSelectionsSqliteRecord> {
  const rows = await db.getAllAsync<HabitRow>('SELECT date, habit_id FROM habit_selections ORDER BY date ASC');
  const out: HabitSelectionsSqliteRecord = {};
  for (const row of rows) {
    if (!isValidISODateKey(row.date) || !isHabitId(row.habit_id)) continue;
    (out[row.date] ||= []).push(row.habit_id);
  }
  return out;
}

export async function clearHabitSelectionsSqlite(db: MoodlySqliteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM habit_selections');
}

export async function importHabitSelectionsToSqlite(
  db: MoodlySqliteDatabase,
  selections: HabitSelectionsSqliteRecord
): Promise<number> {
  let count = 0;
  await db.withTransactionAsync(async () => {
    await clearHabitSelectionsSqlite(db);
    for (const [date, ids] of Object.entries(selections)) {
      if (!isValidISODateKey(date)) continue;
      for (const id of ids) {
        if (!isHabitId(id)) continue;
        await db.runAsync('INSERT OR REPLACE INTO habit_selections (date, habit_id) VALUES (?, ?)', date, id);
        count += 1;
      }
    }
  });
  return count;
}

export async function countHabitSelectionRows(db: MoodlySqliteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM habit_selections');
  return row?.cnt ?? 0;
}

export async function persistHabitSelectionsToSqlite(
  db: MoodlySqliteDatabase,
  selections: HabitSelectionsSqliteRecord
): Promise<void> {
  await importHabitSelectionsToSqlite(db, selections);
}
