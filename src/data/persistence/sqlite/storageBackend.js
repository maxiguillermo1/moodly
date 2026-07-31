/**
 * @fileoverview SQLite meta helpers + entries backend resolution.
 * @module data/persistence/sqlite/storageBackend
 */
import { ensureKairoSqliteReady } from './database';
import { countMoodEntries, importMoodEntriesToSqlite } from './moodEntriesStore';
import { SQL_META_ENTRIES_BACKEND, SQL_META_ENTRIES_IMPORTED, } from './schemaConstants';
import { safeParseEntriesForImport } from './importFromAsyncStorage';
const ENTRIES_STORAGE_KEY = 'kairo.entries';
const BACKEND_FLAG_KEY = 'kairo.entries.backend';
let resolvedBackend = null;
function forcedBackendFromEnv() {
    if (typeof process === 'undefined')
        return null;
    const v = process.env.KAIRO_ENTRIES_BACKEND;
    if (v === 'async' || v === 'sqlite')
        return v;
    return null;
}
async function readMeta(db, key) {
    const row = await db.getFirstAsync('SELECT value FROM kairo_meta WHERE key = ?', key);
    return row?.value ?? null;
}
async function writeMeta(db, key, value) {
    await db.runAsync('INSERT OR REPLACE INTO kairo_meta (key, value) VALUES (?, ?)', key, value);
}
export async function resolveMoodEntriesBackend(store) {
    const forced = forcedBackendFromEnv();
    if (forced) {
        resolvedBackend = forced;
        return forced;
    }
    if (resolvedBackend)
        return resolvedBackend;
    const flag = await store.getItem(BACKEND_FLAG_KEY);
    if (flag === 'sqlite') {
        resolvedBackend = 'sqlite';
        return 'sqlite';
    }
    try {
        const db = await ensureKairoSqliteReady();
        const backendMeta = await readMeta(db, SQL_META_ENTRIES_BACKEND);
        if (backendMeta === 'sqlite') {
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
/**
 * One-shot import: legacy AsyncStorage `kairo.entries` → SQLite `mood_entries`.
 * Idempotent when meta flag is already set.
 */
export async function ensureMoodEntriesImportedFromAsyncStorage(store) {
    const forced = forcedBackendFromEnv();
    if (forced === 'async')
        return;
    let db;
    try {
        db = await ensureKairoSqliteReady();
    }
    catch {
        return;
    }
    const importedFlag = await readMeta(db, SQL_META_ENTRIES_IMPORTED);
    if (importedFlag === '1') {
        await writeMeta(db, SQL_META_ENTRIES_BACKEND, 'sqlite');
        await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
        resolvedBackend = 'sqlite';
        return;
    }
    const sqliteCount = await countMoodEntries(db);
    if (sqliteCount > 0) {
        await writeMeta(db, SQL_META_ENTRIES_IMPORTED, '1');
        await writeMeta(db, SQL_META_ENTRIES_BACKEND, 'sqlite');
        await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
        resolvedBackend = 'sqlite';
        return;
    }
    const raw = await store.getItem(ENTRIES_STORAGE_KEY);
    if (!raw) {
        await writeMeta(db, SQL_META_ENTRIES_IMPORTED, '1');
        await writeMeta(db, SQL_META_ENTRIES_BACKEND, 'sqlite');
        await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
        resolvedBackend = 'sqlite';
        return;
    }
    const record = safeParseEntriesForImport(raw);
    if (Object.keys(record).length > 0) {
        await importMoodEntriesToSqlite(db, record);
    }
    await writeMeta(db, SQL_META_ENTRIES_IMPORTED, '1');
    await writeMeta(db, SQL_META_ENTRIES_BACKEND, 'sqlite');
    await store.setItem(BACKEND_FLAG_KEY, 'sqlite');
    resolvedBackend = 'sqlite';
}
export function resetMoodEntriesBackendCacheForTests() {
    resolvedBackend = null;
}
export async function isMoodEntriesSqliteActive(store) {
    return (await resolveMoodEntriesBackend(store)) === 'sqlite';
}
