/**
 * @fileoverview SQLite write-lock regression tests (nested transaction prevention).
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
    const { resetKairoSqliteWriteLockForTests, getSqliteTxDepthForTests } = require('./sqliteWriteLock');
    resetSharedInMemoryKairoDatabase();
    __setKairoSqliteDatabaseForTests(getSharedInMemoryKairoDatabase());
    resetKairoSqliteBootstrapForTests();
    resetKairoSqliteWriteLockForTests();
    expect(getSqliteTxDepthForTests()).toBe(0);
    const { resetMoodEntriesBackendCacheForTests } = require('./storageBackend');
    const { resetHabitSelectionsBackendCacheForTests } = require('./habitsStorageBackend');
    const { resetGoalsBackendCacheForTests } = require('./goalsStorageBackend');
    resetMoodEntriesBackendCacheForTests();
    resetHabitSelectionsBackendCacheForTests();
    resetGoalsBackendCacheForTests();
    const { resetPersistenceBootstrapForTests } = require('../bootstrap');
    resetPersistenceBootstrapForTests();
}
describe('sqliteWriteLock', () => {
    beforeEach(async () => {
        jest.resetModules();
        await getAsyncStorage().clear();
        resetSqliteTestHarness();
    });
    it('runs nested runInKairoSqliteTransaction inline without nested withTransactionAsync', async () => {
        const { ensureKairoSqliteReady } = require('./database');
        const { runInKairoSqliteTransaction, getSqliteTxDepthForTests } = require('./sqliteWriteLock');
        const db = await ensureKairoSqliteReady();
        await runInKairoSqliteTransaction(db, async () => {
            expect(getSqliteTxDepthForTests()).toBe(1);
            await runInKairoSqliteTransaction(db, async () => {
                expect(getSqliteTxDepthForTests()).toBe(1);
                await db.runAsync('INSERT OR REPLACE INTO habit_selections (date, habit_id) VALUES (?, ?)', '2026-05-03', 'workout');
            });
        });
        expect(getSqliteTxDepthForTests()).toBe(0);
    });
    it('serializes overlapping cross-domain SQLite transactions', async () => {
        await getAsyncStorage().setItem('kairo.habitSelections.backend', 'sqlite');
        await getAsyncStorage().setItem('kairo.entries.backend', 'sqlite');
        const { ensureLocalPersistenceReady } = require('../bootstrap');
        await ensureLocalPersistenceReady();
        const { setAllHabitSelectionsRecord } = require('../../storage/habitSelectionsStorage');
        const { setAllEntries } = require('../../storage/moodStorage');
        await Promise.all([
            setAllEntries({
                '2026-05-01': {
                    date: '2026-05-01',
                    mood: 'A',
                    note: '',
                    createdAt: 1,
                    updatedAt: 1,
                },
            }),
            setAllHabitSelectionsRecord({ '2026-05-02': ['workout'] }),
        ]);
        const { ensureKairoSqliteReady } = require('./database');
        const { loadHabitSelectionsFromSqlite } = require('./habitSelectionsStore');
        const { loadAllMoodEntriesFromSqlite } = require('./moodEntriesStore');
        const db = await ensureKairoSqliteReady();
        expect(await loadHabitSelectionsFromSqlite(db)).toEqual({ '2026-05-02': ['workout'] });
        expect(await loadAllMoodEntriesFromSqlite(db)).toEqual({
            '2026-05-01': {
                date: '2026-05-01',
                mood: 'A',
                note: '',
                createdAt: 1,
                updatedAt: 1,
            },
        });
    });
    it('cloud pull path: sequential setAll mood then habits does not fail', async () => {
        await getAsyncStorage().setItem('kairo.habitSelections.backend', 'sqlite');
        await getAsyncStorage().setItem('kairo.entries.backend', 'sqlite');
        const { ensureLocalPersistenceReady } = require('../bootstrap');
        await ensureLocalPersistenceReady();
        const { setAllHabitSelectionsRecord } = require('../../storage/habitSelectionsStorage');
        const { setAllEntries } = require('../../storage/moodStorage');
        await setAllEntries({
            '2026-05-01': {
                date: '2026-05-01',
                mood: 'A',
                note: '',
                createdAt: 1,
                updatedAt: 1,
            },
        });
        await setAllHabitSelectionsRecord({ '2026-05-02': ['workout'] });
        const { ensureKairoSqliteReady } = require('./database');
        const { loadHabitSelectionsFromSqlite } = require('./habitSelectionsStore');
        const db = await ensureKairoSqliteReady();
        expect(await loadHabitSelectionsFromSqlite(db)).toEqual({ '2026-05-02': ['workout'] });
    });
});
