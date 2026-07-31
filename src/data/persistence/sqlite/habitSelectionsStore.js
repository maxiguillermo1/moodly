/**
 * @fileoverview SQLite habit_selections CRUD.
 * @module data/persistence/sqlite/habitSelectionsStore
 */
import { isHabitId } from '../../../lib/constants/habitsCatalog';
import { isValidISODateKey } from '../../model/entry';
import { runInKairoSqliteTransaction } from './sqliteWriteLock';
export async function loadHabitSelectionsFromSqlite(db) {
    let _a;
    const rows = await db.getAllAsync('SELECT date, habit_id FROM habit_selections ORDER BY date ASC');
    const out = {};
    for (const row of rows) {
        if (!isValidISODateKey(row.date) || !isHabitId(row.habit_id))
            continue;
        (out[_a = row.date] || (out[_a] = [])).push(row.habit_id);
    }
    return out;
}
export async function clearHabitSelectionsSqlite(db) {
    await db.runAsync('DELETE FROM habit_selections');
}
export async function importHabitSelectionsToSqlite(db, selections) {
    let count = 0;
    await runInKairoSqliteTransaction(db, async () => {
        await clearHabitSelectionsSqlite(db);
        for (const [date, ids] of Object.entries(selections)) {
            if (!isValidISODateKey(date))
                continue;
            for (const id of ids) {
                if (!isHabitId(id))
                    continue;
                await db.runAsync('INSERT OR REPLACE INTO habit_selections (date, habit_id) VALUES (?, ?)', date, id);
                count += 1;
            }
        }
    });
    return count;
}
export async function countHabitSelectionRows(db) {
    const row = await db.getFirstAsync('SELECT COUNT(*) as cnt FROM habit_selections');
    return row?.cnt ?? 0;
}
export async function persistHabitSelectionsToSqlite(db, selections) {
    await importHabitSelectionsToSqlite(db, selections);
}
