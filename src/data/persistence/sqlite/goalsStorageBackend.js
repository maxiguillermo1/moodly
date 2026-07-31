/**
 * @fileoverview SQLite meta + import for goals.
 * @module data/persistence/sqlite/goalsStorageBackend
 */
import { ensureKairoSqliteReady } from './database';
import { countGoalsSqlite, importGoalsRecordToSqlite } from './goalsStore';
import { readSqliteMeta, writeSqliteMeta } from './sqliteMeta';
import { SQL_META_GOALS_BACKEND, SQL_META_GOALS_IMPORTED } from './schemaConstants';
const GOALS_STORAGE_KEY = 'kairo.goals';
const BACKEND_FLAG_KEY = 'kairo.goals.backend';
let resolvedBackend = null;
export function resetGoalsBackendCacheForTests() {
    resolvedBackend = null;
}
export async function resolveGoalsBackend(store) {
    if (resolvedBackend)
        return resolvedBackend;
    const flag = await store.getItem(BACKEND_FLAG_KEY);
    if (flag === 'sqlite') {
        resolvedBackend = 'sqlite';
        return 'sqlite';
    }
    try {
        const db = await ensureKairoSqliteReady();
        if ((await readSqliteMeta(db, SQL_META_GOALS_BACKEND)) === 'sqlite') {
            await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
            resolvedBackend = 'sqlite';
            return 'sqlite';
        }
    }
    catch {
        resolvedBackend = 'async';
        return 'async';
    }
    resolvedBackend = 'async';
    return 'async';
}
function parseGoalsForImport(raw) {
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export async function ensureGoalsImportedFromAsyncStorage(store) {
    let db;
    try {
        db = await ensureKairoSqliteReady();
    }
    catch {
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
export async function resetGoalsSqliteImportState(db) {
    await db.runAsync('DELETE FROM goal_progress');
    await db.runAsync('DELETE FROM goals');
    await writeSqliteMeta(db, SQL_META_GOALS_IMPORTED, '0');
    await writeSqliteMeta(db, SQL_META_GOALS_BACKEND, '');
}
