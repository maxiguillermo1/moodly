describe('demoSeed (no auto synthetic data)', () => {
    beforeEach(async () => {
        globalThis.__KAIRO_CHAOS__ = undefined;
        jest.resetModules();
        const mod = require('@react-native-async-storage/async-storage');
        const AsyncStorage = mod?.default ?? mod;
        await AsyncStorage.clear();
    });
    it('seedDemoEntriesIfEmpty does not write demo rows (opt-in via rebuild only)', async () => {
        const { seedDemoEntriesIfEmpty } = require('./demoSeed');
        const { getAllEntries } = require('./moodStorage');
        await expect(seedDemoEntriesIfEmpty()).resolves.toBeUndefined();
        const entries = await getAllEntries();
        expect(Object.keys(entries).length).toBe(0);
    });
});
