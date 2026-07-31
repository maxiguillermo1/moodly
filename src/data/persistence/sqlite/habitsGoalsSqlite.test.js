/**
 * @fileoverview SQLite habit selections + goals import tests.
 */
function getAsyncStorage() {
    const mod = require('@react-native-async-storage/async-storage');
    return mod?.default ?? mod;
}
function resetSqliteTestHarness() {
    const { __resetExpoSqliteMockForTests } = require('./__mocks__/expoSqliteMock');
    __resetExpoSqliteMockForTests();
    const { __setKairoSqliteDatabaseForTests, resetKairoSqliteBootstrapForTests } = require('./database');
    const { getSharedInMemoryKairoDatabase, resetSharedInMemoryKairoDatabase } = require('./testInMemoryDatabase');
    const { resetKairoSqliteWriteLockForTests } = require('./sqliteWriteLock');
    resetSharedInMemoryKairoDatabase();
    __setKairoSqliteDatabaseForTests(getSharedInMemoryKairoDatabase());
    resetKairoSqliteBootstrapForTests();
    resetKairoSqliteWriteLockForTests();
    const { resetMoodEntriesBackendCacheForTests } = require('./storageBackend');
    const { resetHabitSelectionsBackendCacheForTests } = require('./habitsStorageBackend');
    const { resetGoalsBackendCacheForTests } = require('./goalsStorageBackend');
    resetMoodEntriesBackendCacheForTests();
    resetHabitSelectionsBackendCacheForTests();
    resetGoalsBackendCacheForTests();
    const { resetPersistenceBootstrapForTests } = require('../bootstrap');
    resetPersistenceBootstrapForTests();
}
describe('sqlite habits and goals persistence', () => {
    beforeEach(async () => {
        jest.resetModules();
        await getAsyncStorage().clear();
        resetSqliteTestHarness();
    });
    it('imports legacy habit selections into habit_selections on bootstrap', async () => {
        await getAsyncStorage().setItem('kairo.habitSelections', JSON.stringify({ v: 3, selections: { '2026-05-01': ['workout'] }, toggleTotals: {} }));
        const { ensureLocalPersistenceReady } = require('../bootstrap');
        await ensureLocalPersistenceReady();
        const { ensureKairoSqliteReady } = require('./database');
        const { countHabitSelectionRows, loadHabitSelectionsFromSqlite } = require('./habitSelectionsStore');
        const db = await ensureKairoSqliteReady();
        expect(await countHabitSelectionRows(db)).toBe(1);
        expect(await loadHabitSelectionsFromSqlite(db)).toEqual({ '2026-05-01': ['workout'] });
        expect(await getAsyncStorage().getItem('kairo.habitSelections.backend')).toBe('sqlite');
    });
    it('imports legacy goals into goals tables on bootstrap', async () => {
        const goalsRecord = {
            version: 2,
            goalsById: {
                g1: {
                    id: 'g1',
                    title: 'Run',
                    type: 'habit',
                    habitId: 'workout',
                    progress: { currentValue: 1, targetValue: 7 },
                    history: [{ id: 'h1', date: '2026-05-01', value: 1, note: '', createdAt: 1 }],
                    createdAt: 1,
                    updatedAt: 1,
                    status: 'active',
                },
            },
        };
        await getAsyncStorage().setItem('kairo.goals', JSON.stringify(goalsRecord));
        const { ensureLocalPersistenceReady } = require('../bootstrap');
        await ensureLocalPersistenceReady();
        const { ensureKairoSqliteReady } = require('./database');
        const { countGoalsSqlite, loadGoalsRecordFromSqlite } = require('./goalsStore');
        const db = await ensureKairoSqliteReady();
        expect(await countGoalsSqlite(db)).toBe(1);
        const loaded = await loadGoalsRecordFromSqlite(db);
        expect(loaded.goalsById.g1?.title).toBe('Run');
        expect(loaded.goalsById.g1?.history).toHaveLength(1);
        expect(await getAsyncStorage().getItem('kairo.goals.backend')).toBe('sqlite');
    });
});
