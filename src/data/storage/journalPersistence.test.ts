/**
 * Journal UI is a sorted projection of {@link MoodEntry} rows (same disk map as mood).
 */

describe('journal list projection (persisted mood rows)', () => {
  beforeEach(async () => {
    (globalThis as any).__MOODLY_CHAOS__ = undefined;
    jest.resetModules();
    const faultMod = require('./storageFaultInjection') as typeof import('./storageFaultInjection');
    faultMod.__resetAsyncStorageFaultInjectionForTests();
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.clear();
  });

  it('getEntriesSortedDesc returns newest-by-date first (journal ordering)', async () => {
    const { upsertEntry, getEntriesSortedDesc } = require('./moodStorage') as typeof import('./moodStorage');
    await upsertEntry({ date: '2026-01-02', mood: 'A', note: 'older', createdAt: 1, updatedAt: 2 });
    await upsertEntry({ date: '2026-01-10', mood: 'B', note: 'newer', createdAt: 1, updatedAt: 2 });
    const list = await getEntriesSortedDesc();
    expect(list).toHaveLength(2);
    expect(list[0]?.date).toBe('2026-01-10');
    expect(list[1]?.date).toBe('2026-01-02');
    expect(list[0]?.note).toBe('newer');
  });
});
