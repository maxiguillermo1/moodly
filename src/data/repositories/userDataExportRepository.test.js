/**
 * @fileoverview User export/import repository tests.
 */
import { generateSyntheticMoodEntries } from '../../qa/entriesScaleHarness';
function getAsyncStorage() {
    const mod = require('@react-native-async-storage/async-storage');
    return mod?.default ?? mod;
}
function resetHarness() {
    const { __resetExpoSqliteMockForTests } = require('../persistence/sqlite/__mocks__/expoSqliteMock');
    __resetExpoSqliteMockForTests();
    const { __setKairoSqliteDatabaseForTests, resetKairoSqliteBootstrapForTests } = require('../persistence/sqlite/database');
    const { getSharedInMemoryKairoDatabase, resetSharedInMemoryKairoDatabase } = require('../persistence/sqlite/testInMemoryDatabase');
    resetSharedInMemoryKairoDatabase();
    __setKairoSqliteDatabaseForTests(getSharedInMemoryKairoDatabase());
    resetKairoSqliteBootstrapForTests();
    const { resetMoodEntriesBackendCacheForTests } = require('../persistence/sqlite/storageBackend');
    const { resetHabitSelectionsBackendCacheForTests } = require('../persistence/sqlite/habitsStorageBackend');
    const { resetGoalsBackendCacheForTests } = require('../persistence/sqlite/goalsStorageBackend');
    resetMoodEntriesBackendCacheForTests();
    resetHabitSelectionsBackendCacheForTests();
    resetGoalsBackendCacheForTests();
    const { resetPersistenceBootstrapForTests } = require('../persistence/bootstrap');
    resetPersistenceBootstrapForTests();
    const { resetEntriesStorageSessionStateForTests } = require('../storage/moodStorage');
    resetEntriesStorageSessionStateForTests();
}
describe('userDataExportRepository', () => {
    beforeEach(async () => {
        jest.resetModules();
        await getAsyncStorage().clear();
        resetHarness();
    });
    it('export includes sqlite mood entries in kv', async () => {
        const { upsertEntry } = require('../storage/moodStorage');
        await upsertEntry({
            date: '2026-05-01',
            mood: 'A',
            note: 'export me',
            createdAt: 1,
            updatedAt: 1,
        });
        const { exportUserDataJson } = require('./userDataExportRepository');
        const json = await exportUserDataJson();
        const parsed = JSON.parse(json);
        expect(parsed.kv['kairo.entries']).toContain('2026-05-01');
        expect(parsed.kv['kairo.entries']).toContain('export me');
    });
    it('import restores entries from export round-trip', async () => {
        const record = generateSyntheticMoodEntries(3);
        await getAsyncStorage().setItem('kairo.entries', JSON.stringify(record));
        const { exportUserDataJson, importUserDataFromJson } = require('./userDataExportRepository');
        const exported = await exportUserDataJson();
        await getAsyncStorage().clear();
        resetHarness();
        await importUserDataFromJson(exported);
        const { getAllEntries } = require('../storage/moodStorage');
        const loaded = await getAllEntries();
        expect(Object.keys(loaded)).toHaveLength(3);
    });
});
