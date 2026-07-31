/**
 * @fileoverview Normalized mood_entries CRUD (SQLite backend).
 * @module data/persistence/sqlite/moodEntriesStore
 */
import { isValidISODateKey, VALID_MOOD_SET } from '../../model/entry';
import { runInKairoSqliteTransaction } from './sqliteWriteLock';
function rowToEntry(row) {
    if (!isValidISODateKey(row.date))
        return null;
    if (!VALID_MOOD_SET.has(row.mood))
        return null;
    if (!Number.isFinite(row.created_at_ms) || !Number.isFinite(row.updated_at_ms))
        return null;
    return {
        date: row.date,
        mood: row.mood,
        note: typeof row.note === 'string' ? row.note : '',
        createdAt: row.created_at_ms,
        updatedAt: row.updated_at_ms,
    };
}
export async function countMoodEntries(db) {
    const row = await db.getFirstAsync('SELECT COUNT(*) as cnt FROM mood_entries');
    return row?.cnt ?? 0;
}
export async function loadAllMoodEntriesFromSqlite(db) {
    const rows = await db.getAllAsync('SELECT * FROM mood_entries');
    const out = {};
    for (const row of rows) {
        const entry = rowToEntry(row);
        if (entry)
            out[entry.date] = entry;
    }
    return out;
}
export async function upsertMoodEntrySqlite(db, entry) {
    await db.runAsync(`INSERT OR REPLACE INTO mood_entries (date, mood, note, created_at_ms, updated_at_ms)
     VALUES (?, ?, ?, ?, ?)`, entry.date, entry.mood, entry.note, entry.createdAt, entry.updatedAt);
}
export async function deleteMoodEntrySqlite(db, date) {
    await db.runAsync('DELETE FROM mood_entries WHERE date = ?', date);
}
export async function clearMoodEntriesSqlite(db) {
    await db.runAsync('DELETE FROM mood_entries');
}
export async function importMoodEntriesToSqlite(db, record) {
    let imported = 0;
    await runInKairoSqliteTransaction(db, async () => {
        for (const entry of Object.values(record)) {
            if (!entry)
                continue;
            const normalized = rowToEntry({
                date: entry.date,
                mood: entry.mood,
                note: entry.note,
                created_at_ms: entry.createdAt,
                updated_at_ms: entry.updatedAt,
            });
            if (!normalized)
                continue;
            await upsertMoodEntrySqlite(db, normalized);
            imported += 1;
        }
    });
    return imported;
}
/** Atomically replace all mood rows (cloud pull / setAllEntries). */
export async function replaceAllMoodEntriesInSqlite(db, record) {
    let imported = 0;
    await runInKairoSqliteTransaction(db, async () => {
        await clearMoodEntriesSqlite(db);
        for (const entry of Object.values(record)) {
            if (!entry)
                continue;
            const normalized = rowToEntry({
                date: entry.date,
                mood: entry.mood,
                note: entry.note,
                created_at_ms: entry.createdAt,
                updated_at_ms: entry.updatedAt,
            });
            if (!normalized)
                continue;
            await upsertMoodEntrySqlite(db, normalized);
            imported += 1;
        }
    });
    return imported;
}
