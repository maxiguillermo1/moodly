/**
 * @fileoverview Shared SQLite kairo_meta helpers.
 * @module data/persistence/sqlite/sqliteMeta
 */
export async function readSqliteMeta(db, key) {
    const row = await db.getFirstAsync('SELECT value FROM kairo_meta WHERE key = ?', key);
    return row?.value ?? null;
}
export async function writeSqliteMeta(db, key, value) {
    await db.runAsync('INSERT OR REPLACE INTO kairo_meta (key, value) VALUES (?, ?)', key, value);
}
export async function deleteSqliteMeta(db, key) {
    await db.runAsync('DELETE FROM kairo_meta WHERE key = ?', key);
}
