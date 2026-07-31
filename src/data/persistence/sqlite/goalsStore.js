/**
 * @fileoverview SQLite goals + goal_progress CRUD.
 * @module data/persistence/sqlite/goalsStore
 */
import { isValidISODateKey } from '../../model/entry';
import { runInKairoSqliteTransaction } from './sqliteWriteLock';
const GOALS_SQLITE_RECORD_VERSION = 2;
function goalWithoutHistory(goal) {
    const { history, ...rest } = goal;
    void history;
    return rest;
}
export async function loadGoalsRecordFromSqlite(db) {
    const goalRows = await db.getAllAsync('SELECT id, payload_json, updated_at_ms FROM goals');
    const progressRows = await db.getAllAsync('SELECT goal_id, date, value, note, created_at_ms FROM goal_progress');
    const progressByGoal = new Map();
    for (const row of progressRows) {
        if (!isValidISODateKey(row.date))
            continue;
        const list = progressByGoal.get(row.goal_id) ?? [];
        list.push({
            id: `${row.goal_id}:${row.date}`,
            date: row.date,
            value: row.value,
            note: row.note ?? '',
            createdAt: row.created_at_ms,
        });
        progressByGoal.set(row.goal_id, list);
    }
    const goalsById = {};
    for (const row of goalRows) {
        try {
            const base = JSON.parse(row.payload_json);
            if (!base?.id)
                continue;
            goalsById[base.id] = {
                ...base,
                history: progressByGoal.get(base.id) ?? [],
            };
        }
        catch {
            /* skip invalid row */
        }
    }
    return { version: GOALS_SQLITE_RECORD_VERSION, goalsById };
}
export async function clearGoalsSqlite(db) {
    await db.runAsync('DELETE FROM goal_progress');
    await db.runAsync('DELETE FROM goals');
}
export async function importGoalsRecordToSqlite(db, record) {
    let imported = 0;
    await runInKairoSqliteTransaction(db, async () => {
        await clearGoalsSqlite(db);
        for (const goal of Object.values(record.goalsById)) {
            if (!goal?.id)
                continue;
            await db.runAsync('INSERT OR REPLACE INTO goals (id, payload_json, updated_at_ms) VALUES (?, ?, ?)', goal.id, JSON.stringify(goalWithoutHistory(goal)), goal.updatedAt);
            for (const h of goal.history ?? []) {
                if (!isValidISODateKey(h.date))
                    continue;
                await db.runAsync('INSERT OR REPLACE INTO goal_progress (goal_id, date, value, note, created_at_ms) VALUES (?, ?, ?, ?, ?)', goal.id, h.date, h.value, h.note ?? '', h.createdAt);
            }
            imported += 1;
        }
    });
    return imported;
}
export async function persistGoalsRecordToSqlite(db, record) {
    await importGoalsRecordToSqlite(db, record);
}
export async function countGoalsSqlite(db) {
    const row = await db.getFirstAsync('SELECT COUNT(*) as cnt FROM goals');
    return row?.cnt ?? 0;
}
