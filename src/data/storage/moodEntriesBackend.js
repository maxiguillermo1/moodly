/**
 * @fileoverview Mood entries persistence adapter (AsyncStorage legacy vs SQLite).
 * @module data/storage/moodEntriesBackend
 */
import { validateEntriesRecord } from '../model/entry';
import { getDefaultLocalKeyValueStore } from '../persistence/localStore';
import { ensureKairoSqliteReady } from '../persistence/sqlite/database';
import { clearMoodEntriesSqlite, deleteMoodEntrySqlite, loadAllMoodEntriesFromSqlite, replaceAllMoodEntriesInSqlite, upsertMoodEntrySqlite, } from '../persistence/sqlite/moodEntriesStore';
import { resolveMoodEntriesBackend } from '../persistence/sqlite/storageBackend';
import { withKairoSqliteWriteLock } from '../persistence/sqlite/sqliteWriteLock';
import { storage } from './asyncStorage';
export const MOOD_ENTRIES_STORAGE_KEY = 'kairo.entries';
async function usesSqlite() {
    const store = getDefaultLocalKeyValueStore();
    return (await resolveMoodEntriesBackend(store)) === 'sqlite';
}
export async function moodEntriesUsesSqlite() {
    return usesSqlite();
}
export async function loadMoodEntriesFromDisk() {
    if (await usesSqlite()) {
        const db = await ensureKairoSqliteReady();
        return loadAllMoodEntriesFromSqlite(db);
    }
    const json = await storage.getItem(MOOD_ENTRIES_STORAGE_KEY);
    if (!json)
        return {};
    try {
        const raw = JSON.parse(json);
        return validateEntriesRecord(raw);
    }
    catch {
        return {};
    }
}
export async function persistMoodEntriesBlob(record) {
    if (await usesSqlite()) {
        const db = await ensureKairoSqliteReady();
        await replaceAllMoodEntriesInSqlite(db, record);
        return;
    }
    await storage.setItem(MOOD_ENTRIES_STORAGE_KEY, JSON.stringify(record));
}
export async function persistMoodEntryRow(entry, fullRecord) {
    if (await usesSqlite()) {
        const db = await ensureKairoSqliteReady();
        await upsertMoodEntrySqlite(db, entry);
        return;
    }
    await storage.setItem(MOOD_ENTRIES_STORAGE_KEY, JSON.stringify(fullRecord));
}
export async function deleteMoodEntryRow(date, fullRecord) {
    if (await usesSqlite()) {
        const db = await ensureKairoSqliteReady();
        await deleteMoodEntrySqlite(db, date);
        return;
    }
    await storage.setItem(MOOD_ENTRIES_STORAGE_KEY, JSON.stringify(fullRecord));
}
export async function clearMoodEntriesOnDisk() {
    if (await usesSqlite()) {
        const db = await ensureKairoSqliteReady();
        await withKairoSqliteWriteLock(async () => {
            await clearMoodEntriesSqlite(db);
        });
        return;
    }
    await storage.removeItem(MOOD_ENTRIES_STORAGE_KEY);
}
export async function readRawMoodEntriesJson() {
    return storage.getItem(MOOD_ENTRIES_STORAGE_KEY);
}
export async function quarantineRawMoodEntriesJson(rawJson, backupKey) {
    await storage.setItem(backupKey, rawJson);
    if (await usesSqlite()) {
        const db = await ensureKairoSqliteReady();
        await withKairoSqliteWriteLock(async () => {
            await clearMoodEntriesSqlite(db);
        });
        return;
    }
    await storage.setItem(MOOD_ENTRIES_STORAGE_KEY, JSON.stringify({}));
}
