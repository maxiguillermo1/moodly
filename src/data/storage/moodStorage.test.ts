const STORAGE_KEY = 'moodly.entries';

describe('moodStorage reliability edge cases', () => {
  beforeEach(async () => {
    (globalThis as any).__MOODLY_CHAOS__ = undefined;
    jest.resetModules();
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.clear();
  });

  it('corrupt entries JSON is quarantined/reset (no crash) (#12, #20)', async () => {
    const { getAllEntries } = require('./moodStorage') as typeof import('./moodStorage');
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.setItem(STORAGE_KEY, '{not json');
    const res = await getAllEntries();
    expect(res).toEqual({});
    const after = await AsyncStorage.getItem(STORAGE_KEY);
    expect(after).toBe(JSON.stringify({}));
  });

  it('setItem failure does not commit RAM caches (persist-first) (#10)', async () => {
    const { upsertEntry, getEntry, getAllEntries } = require('./moodStorage') as typeof import('./moodStorage');
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.clear();
    (globalThis as any).__MOODLY_CHAOS__ = { enabled: true, seed: 1, failNext: { setItem: 1 } };
    await expect(
      upsertEntry({ date: '2026-02-09', mood: 'A', note: '', createdAt: 1, updatedAt: 1 })
    ).rejects.toBeTruthy();

    // Disable chaos and confirm the entry does not appear.
    (globalThis as any).__MOODLY_CHAOS__ = undefined;
    const e = await getEntry('2026-02-09');
    expect(e).toBeNull();
    const all = await getAllEntries();
    expect(all).toEqual({});
  });

  it('getItem failure returns safe defaults; no crash (#9)', async () => {
    const { getAllEntries } = require('./moodStorage') as typeof import('./moodStorage');
    (globalThis as any).__MOODLY_CHAOS__ = { enabled: true, seed: 1, failNext: { getItem: 1 } };
    const res = await getAllEntries();
    expect(res).toEqual({});
  });

  it('removeItem failure during clear does not corrupt RAM caches (#11)', async () => {
    const { upsertEntry, getAllEntries, clearAllEntries } = require('./moodStorage') as typeof import('./moodStorage');
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.clear();
    await upsertEntry({ date: '2026-02-09', mood: 'A', note: '', createdAt: 1, updatedAt: 1 });
    const before = await getAllEntries();
    expect(Object.keys(before)).toHaveLength(1);

    (globalThis as any).__MOODLY_CHAOS__ = { enabled: true, seed: 1, failNext: { removeItem: 1 } };
    await expect(clearAllEntries()).rejects.toBeTruthy();

    (globalThis as any).__MOODLY_CHAOS__ = undefined;
    const after = await getAllEntries();
    expect(Object.keys(after)).toHaveLength(1);
    expect(after['2026-02-09']?.mood).toBe('A');
  });

  it('concurrent writes are serialized; no lost updates (#19)', async () => {
    const { upsertEntry, getAllEntries } = require('./moodStorage') as typeof import('./moodStorage');
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.clear();
    (globalThis as any).__MOODLY_CHAOS__ = {
      enabled: true,
      seed: 7,
      // Deterministic, small delay to maximize interleaving pressure.
      minDelayMs: 10,
      maxDelayMs: 10,
      pFail: 0,
      failOps: ['setItem'],
    };

    await Promise.all([
      upsertEntry({ date: '2026-02-09', mood: 'A', note: '', createdAt: 1, updatedAt: 1 }),
      upsertEntry({ date: '2026-02-10', mood: 'B', note: '', createdAt: 1, updatedAt: 1 }),
    ]);

    (globalThis as any).__MOODLY_CHAOS__ = undefined;
    const all = await getAllEntries();
    expect(all['2026-02-09']?.mood).toBe('A');
    expect(all['2026-02-10']?.mood).toBe('B');
  });
});

