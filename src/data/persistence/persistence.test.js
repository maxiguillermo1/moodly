import { SCHEMA_META_STORAGE_KEY, CURRENT_SCHEMA_VERSION } from './schemaConstants';
import { readSchemaMeta } from './schemaMeta';
import { DiskSchemaAheadOfAppError, runLocalMigrations, resetCorruptSchemaMeta } from './migrations/runMigrations';
import { parseMigrationBackupEnvelope } from './migrations/migrationBackup';
import { ensureLocalPersistenceReady, resetPersistenceBootstrapForTests } from './bootstrap';
function createMemoryStore(initial = {}) {
    const m = { ...initial };
    return {
        getItem: async (key) => (Object.prototype.hasOwnProperty.call(m, key) ? m[key] : null),
        setItem: async (key, value) => {
            m[key] = value;
        },
        removeItem: async (key) => {
            delete m[key];
        },
        multiGet: async (keys) => keys.map((key) => [key, Object.prototype.hasOwnProperty.call(m, key) ? m[key] : null]),
        multiSet: async (pairs) => {
            for (const [k, v] of pairs)
                m[k] = v;
        },
        multiRemove: async (keys) => {
            for (const k of keys)
                delete m[k];
        },
        getAllKeys: async () => Object.keys(m),
    };
}
describe('local schema migrations (KeyValueStore)', () => {
    it('stamps current schema version on empty store', async () => {
        const store = createMemoryStore();
        await runLocalMigrations(store);
        const meta = await readSchemaMeta(store);
        expect(meta?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });
    it('writes a migration backup envelope before advancing schema', async () => {
        const store = createMemoryStore({
            'kairo.entries': JSON.stringify({ '2026-01-01': { date: '2026-01-01', mood: 'A', note: '', createdAt: 1, updatedAt: 1 } }),
        });
        await runLocalMigrations(store);
        const keys = await store.getAllKeys();
        const backupKeys = keys.filter((k) => k.startsWith('kairo.migrationBackup.'));
        expect(backupKeys.length).toBeGreaterThan(0);
        const raw = await store.getItem(backupKeys[0]);
        const env = parseMigrationBackupEnvelope(raw);
        expect(env?.kind).toBe('kairo.migrationBackup.v1');
        expect(env?.snapshot['kairo.entries']).toContain('2026-01-01');
    });
    it('does not downgrade when disk schema is newer than app', async () => {
        const store = createMemoryStore({
            [SCHEMA_META_STORAGE_KEY]: JSON.stringify({ schemaVersion: 999, migratedAt: 1 }),
        });
        await expect(runLocalMigrations(store)).rejects.toBeInstanceOf(DiskSchemaAheadOfAppError);
        const meta = await readSchemaMeta(store);
        expect(meta?.schemaVersion).toBe(999);
    });
    it('recovers from corrupt schema meta via quarantine helper then migrations', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        const bad = '{not json';
        const store = createMemoryStore({ [SCHEMA_META_STORAGE_KEY]: bad });
        await resetCorruptSchemaMeta(store);
        warnSpy.mockRestore();
        await runLocalMigrations(store);
        const meta = await readSchemaMeta(store);
        expect(meta?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });
});
describe('local persistence bootstrap', () => {
    beforeEach(async () => {
        globalThis.__KAIRO_CHAOS__ = undefined;
        resetPersistenceBootstrapForTests();
        const mod = require('@react-native-async-storage/async-storage');
        await (mod?.default ?? mod).clear();
    });
    it('retries after a transient bootstrap storage failure', async () => {
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        globalThis.__KAIRO_CHAOS__ = {
            enabled: true,
            failNextByKey: { getItem: { [SCHEMA_META_STORAGE_KEY]: 1 } },
        };
        await expect(ensureLocalPersistenceReady()).resolves.toBeUndefined();
        globalThis.__KAIRO_CHAOS__ = undefined;
        errorSpy.mockRestore();
        warnSpy.mockRestore();
        const raw = await AsyncStorage.getItem(SCHEMA_META_STORAGE_KEY);
        expect(JSON.parse(raw).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });
    it('rejects when bootstrap storage stays unavailable after retries', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        globalThis.__KAIRO_CHAOS__ = {
            enabled: true,
            failOps: ['getItem'],
            pFail: 1,
        };
        await expect(ensureLocalPersistenceReady()).rejects.toBeTruthy();
        resetPersistenceBootstrapForTests();
        globalThis.__KAIRO_CHAOS__ = undefined;
        errorSpy.mockRestore();
        warnSpy.mockRestore();
    });
    it('blocks entry writes while disk schema is newer than the app', async () => {
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        await AsyncStorage.setItem(SCHEMA_META_STORAGE_KEY, JSON.stringify({ schemaVersion: 999, migratedAt: 1 }));
        const entries = require('../storage/moodStorage');
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        await expect(entries.upsertEntry(entries.createEntry('2026-06-01', 'A', 'kept safe'))).rejects.toThrow(/not writable|newer than app schema/i);
        errorSpy.mockRestore();
        warnSpy.mockRestore();
        expect(await AsyncStorage.getItem('kairo.entries')).toBeNull();
        const meta = await readSchemaMeta({
            getItem: AsyncStorage.getItem.bind(AsyncStorage),
            setItem: AsyncStorage.setItem.bind(AsyncStorage),
            removeItem: AsyncStorage.removeItem.bind(AsyncStorage),
            multiGet: AsyncStorage.multiGet.bind(AsyncStorage),
            multiSet: AsyncStorage.multiSet.bind(AsyncStorage),
            multiRemove: AsyncStorage.multiRemove.bind(AsyncStorage),
        });
        expect(meta?.schemaVersion).toBe(999);
    });
    it('blocks settings and extension writes while disk schema is newer than the app', async () => {
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        await AsyncStorage.setItem(SCHEMA_META_STORAGE_KEY, JSON.stringify({ schemaVersion: 999, migratedAt: 1 }));
        const settings = require('../storage/settingsStorage');
        const dayTodos = require('../storage/dayTodosStorage');
        const habitSelections = require('../storage/habitSelectionsStorage');
        const habitTracking = require('../storage/habitTrackingStorage');
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        await expect(settings.setTodayTodoEnabled(true)).rejects.toThrow(/newer than app schema/i);
        resetPersistenceBootstrapForTests();
        await expect(dayTodos.addDayTodo('2026-06-02', 'blocked')).rejects.toThrow(/newer than app schema/i);
        resetPersistenceBootstrapForTests();
        await expect(habitSelections.toggleHabitForDate('2026-06-02', 'workout')).rejects.toThrow(/newer than app schema/i);
        resetPersistenceBootstrapForTests();
        await expect(habitTracking.setTrackedHabitIds([])).rejects.toThrow(/newer than app schema/i);
        errorSpy.mockRestore();
        warnSpy.mockRestore();
        expect(await AsyncStorage.getItem('kairo.settings')).toBeNull();
        expect(await AsyncStorage.getItem('kairo.dayTodos')).toBeNull();
        expect(await AsyncStorage.getItem('kairo.habitSelections')).toBeNull();
        expect(await AsyncStorage.getItem('kairo.trackedHabits')).toBeNull();
    });
});
