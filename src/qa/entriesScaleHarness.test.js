/**
 * @fileoverview Cold-load benchmarks for kairo.entries at 1k / 5k / 10k synthetic rows.
 */
import { benchmarkColdEntriesLoad, ENTRIES_SCALE_THRESHOLDS, generateSyntheticMoodEntries, } from './entriesScaleHarness';
const STORAGE_KEY = 'kairo.entries';
function getAsyncStorage() {
    const mod = require('@react-native-async-storage/async-storage');
    return mod?.default ?? mod;
}
describe('entriesScaleHarness', () => {
    beforeEach(async () => {
        jest.resetModules();
        await getAsyncStorage().clear();
        const { __resetExpoSqliteMockForTests } = require('../data/persistence/sqlite/__mocks__/expoSqliteMock');
        __resetExpoSqliteMockForTests();
        const { __setKairoSqliteDatabaseForTests, resetKairoSqliteBootstrapForTests } = require('../data/persistence/sqlite/database');
        const { getSharedInMemoryKairoDatabase } = require('../data/persistence/sqlite/testInMemoryDatabase');
        const { resetMoodEntriesBackendCacheForTests } = require('../data/persistence/sqlite/storageBackend');
        const { resetPersistenceBootstrapForTests } = require('../data/persistence/bootstrap');
        __setKairoSqliteDatabaseForTests(getSharedInMemoryKairoDatabase());
        resetKairoSqliteBootstrapForTests();
        resetMoodEntriesBackendCacheForTests();
        resetPersistenceBootstrapForTests();
    });
    it('generates deterministic multi-year local date keys', () => {
        const record = generateSyntheticMoodEntries(3, 2020);
        expect(Object.keys(record)).toEqual(['2020-01-01', '2020-01-02', '2020-01-03']);
        expect(record['2020-01-01']?.mood).toBe('A+');
    });
    it.each(ENTRIES_SCALE_THRESHOLDS.map((n) => [n]))('cold-load benchmark tier %i completes within Jest budget', async (entryCount) => {
        const { getAllEntries, resetEntriesStorageSessionStateForTests } = require('../data/storage/moodStorage');
        const result = await benchmarkColdEntriesLoad({
            entryCount,
            seedAsyncStorage: async (record) => {
                await getAsyncStorage().setItem(STORAGE_KEY, JSON.stringify(record));
            },
            resetSession: () => resetEntriesStorageSessionStateForTests(),
            load: async () => {
                const { ensureLocalPersistenceReady } = require('../data/persistence/bootstrap');
                await ensureLocalPersistenceReady();
                return getAllEntries();
            },
        });
        expect(result.entryCount).toBe(entryCount);
        expect(result.coldLoadMs).toBeGreaterThanOrEqual(0);
        expect(result.payloadApproxBytes).toBeGreaterThan(0);
        const loaded = await getAllEntries();
        expect(Object.keys(loaded)).toHaveLength(entryCount);
    }, 30000);
});
