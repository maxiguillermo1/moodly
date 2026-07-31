/**
 * @fileoverview SQLite meta + import for habit selections.
 * @module data/persistence/sqlite/habitsStorageBackend
 */
import { isHabitId } from '../../../lib/constants/habitsCatalog';
import { isValidISODateKey } from '../../model/entry';
import { ensureKairoSqliteReady } from './database';
import { countHabitSelectionRows, importHabitSelectionsToSqlite, } from './habitSelectionsStore';
import { readSqliteMeta, writeSqliteMeta } from './sqliteMeta';
import { SQL_META_HABITS_BACKEND, SQL_META_HABITS_IMPORTED } from './schemaConstants';
const HABITS_STORAGE_KEY = 'kairo.habitSelections';
const BACKEND_FLAG_KEY = 'kairo.habitSelections.backend';
let resolvedBackend = null;
export function resetHabitSelectionsBackendCacheForTests() {
    resolvedBackend = null;
}
export async function resolveHabitSelectionsBackend(store) {
    if (resolvedBackend)
        return resolvedBackend;
    const flag = await store.getItem(BACKEND_FLAG_KEY);
    if (flag === 'sqlite') {
        resolvedBackend = 'sqlite';
        return 'sqlite';
    }
    try {
        const db = await ensureKairoSqliteReady();
        if ((await readSqliteMeta(db, SQL_META_HABITS_BACKEND)) === 'sqlite') {
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
function parseHabitSelectionsForImport(raw) {
    if (!raw)
        return {};
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
            return {};
        const o = parsed;
        const root = o.selections ?? parsed;
        if (!root || typeof root !== 'object' || Array.isArray(root))
            return {};
        const out = {};
        for (const [date, ids] of Object.entries(root)) {
            if (!isValidISODateKey(date) || !Array.isArray(ids))
                continue;
            const list = ids.filter((id) => typeof id === 'string' && isHabitId(id));
            if (list.length > 0)
                out[date] = list;
        }
        return out;
    }
    catch {
        return {};
    }
}
export async function ensureHabitSelectionsImportedFromAsyncStorage(store) {
    let db;
    try {
        db = await ensureKairoSqliteReady();
    }
    catch {
        return;
    }
    if ((await readSqliteMeta(db, SQL_META_HABITS_IMPORTED)) === '1') {
        await writeSqliteMeta(db, SQL_META_HABITS_BACKEND, 'sqlite');
        await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
        resolvedBackend = 'sqlite';
        return;
    }
    if ((await countHabitSelectionRows(db)) > 0) {
        await writeSqliteMeta(db, SQL_META_HABITS_IMPORTED, '1');
        await writeSqliteMeta(db, SQL_META_HABITS_BACKEND, 'sqlite');
        await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
        resolvedBackend = 'sqlite';
        return;
    }
    const raw = await store.getItem(HABITS_STORAGE_KEY);
    const selections = parseHabitSelectionsForImport(raw);
    if (Object.keys(selections).length > 0) {
        await importHabitSelectionsToSqlite(db, selections);
    }
    await writeSqliteMeta(db, SQL_META_HABITS_IMPORTED, '1');
    await writeSqliteMeta(db, SQL_META_HABITS_BACKEND, 'sqlite');
    await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
    resolvedBackend = 'sqlite';
}
export async function resetHabitSelectionsSqliteImportState(db) {
    await db.runAsync('DELETE FROM habit_selections');
    await writeSqliteMeta(db, SQL_META_HABITS_IMPORTED, '0');
    await writeSqliteMeta(db, SQL_META_HABITS_BACKEND, '');
}
