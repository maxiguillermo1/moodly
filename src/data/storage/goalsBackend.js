/**
 * @fileoverview Goals persistence adapter (AsyncStorage legacy vs SQLite).
 * @module data/storage/goalsBackend
 */
import { getDefaultLocalKeyValueStore } from '../persistence/localStore';
import { ensureKairoSqliteReady } from '../persistence/sqlite/database';
import { clearGoalsSqlite, loadGoalsRecordFromSqlite, persistGoalsRecordToSqlite, } from '../persistence/sqlite/goalsStore';
import { resolveGoalsBackend } from '../persistence/sqlite/goalsStorageBackend';
import { storage } from './asyncStorage';
export const GOALS_STORAGE_KEY = 'kairo.goals';
async function usesSqlite() {
    const store = getDefaultLocalKeyValueStore();
    return (await resolveGoalsBackend(store)) === 'sqlite';
}
export async function loadGoalsJsonFromDisk() {
    if (await usesSqlite()) {
        const db = await ensureKairoSqliteReady();
        const record = await loadGoalsRecordFromSqlite(db);
        return JSON.stringify(record);
    }
    return storage.getItem(GOALS_STORAGE_KEY);
}
export async function persistGoalsRecordToDisk(record) {
    if (await usesSqlite()) {
        const db = await ensureKairoSqliteReady();
        await persistGoalsRecordToSqlite(db, record);
        return;
    }
    await storage.setItem(GOALS_STORAGE_KEY, JSON.stringify(record));
}
export async function clearGoalsOnDisk() {
    if (await usesSqlite()) {
        const db = await ensureKairoSqliteReady();
        await clearGoalsSqlite(db);
        return;
    }
    await storage.removeItem(GOALS_STORAGE_KEY);
}
export async function quarantineRawGoalsJson(rawJson, backupKey, fallbackJson) {
    await storage.setItem(backupKey, rawJson);
    if (await usesSqlite()) {
        const db = await ensureKairoSqliteReady();
        await clearGoalsSqlite(db);
        return;
    }
    await storage.setItem(GOALS_STORAGE_KEY, fallbackJson);
}
