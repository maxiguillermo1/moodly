describe('demoSeed partial marker failures', () => {
  beforeEach(async () => {
    (globalThis as any).__MOODLY_CHAOS__ = undefined;
    jest.resetModules();
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.clear();
  });

  it('mid-seed marker failure does not break app; seed is best-effort (#14)', async () => {
    const { seedDemoEntriesIfEmpty } = require('./demoSeed') as typeof import('./demoSeed');
    const { getAllEntries } = require('./moodStorage') as typeof import('./moodStorage');
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.clear();
    // Fail the first attempt to write the version marker; entries write should still succeed.
    (globalThis as any).__MOODLY_CHAOS__ = {
      enabled: true,
      seed: 1,
      failNextByKey: { setItem: { 'moodly.demoSeedVersion': 1 } },
    };
    await expect(seedDemoEntriesIfEmpty()).resolves.toBeUndefined();

    (globalThis as any).__MOODLY_CHAOS__ = undefined;
    const entries = await getAllEntries();
    // Should have at least some data (demo seed is large; this is a coarse smoke assertion).
    expect(Object.keys(entries).length).toBeGreaterThan(10);
  });
});

