describe('demoSeed (no auto synthetic data)', () => {
  beforeEach(async () => {
    (globalThis as any).__MOODLY_CHAOS__ = undefined;
    jest.resetModules();
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.clear();
  });

  it('seedDemoEntriesIfEmpty does not write demo rows (opt-in via rebuild only)', async () => {
    const { seedDemoEntriesIfEmpty } = require('./demoSeed') as typeof import('./demoSeed');
    const { getAllEntries } = require('./moodStorage') as typeof import('./moodStorage');
    await expect(seedDemoEntriesIfEmpty()).resolves.toBeUndefined();
    const entries = await getAllEntries();
    expect(Object.keys(entries).length).toBe(0);
  });
});
