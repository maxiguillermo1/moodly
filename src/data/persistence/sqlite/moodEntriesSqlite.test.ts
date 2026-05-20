/**
 * @fileoverview SQLite mood_entries store + AsyncStorage import tests.
 */

import { generateSyntheticMoodEntries } from '../../../qa/entriesScaleHarness';

const STORAGE_KEY = 'kairo.entries';

function getAsyncStorage(): typeof import('@react-native-async-storage/async-storage').default {
  const mod: any = require('@react-native-async-storage/async-storage');
  return mod?.default ?? mod;
}

function resetSqliteTestHarness(): void {
  const { __resetExpoSqliteMockForTests } = require('./__mocks__/expoSqliteMock') as typeof import('./__mocks__/expoSqliteMock');
  __resetExpoSqliteMockForTests();
  const { __setKairoSqliteDatabaseForTests, resetKairoSqliteBootstrapForTests } =
    require('./database') as typeof import('./database');
  const { getSharedInMemoryKairoDatabase, resetSharedInMemoryKairoDatabase } =
    require('./testInMemoryDatabase') as typeof import('./testInMemoryDatabase');
  resetSharedInMemoryKairoDatabase();
  __setKairoSqliteDatabaseForTests(getSharedInMemoryKairoDatabase());
  resetKairoSqliteBootstrapForTests();
  const { resetMoodEntriesBackendCacheForTests } = require('./storageBackend') as typeof import('./storageBackend');
  resetMoodEntriesBackendCacheForTests();
  const { resetPersistenceBootstrapForTests } = require('../bootstrap') as typeof import('../bootstrap');
  resetPersistenceBootstrapForTests();
  const { resetEntriesStorageSessionStateForTests } =
    require('../../storage/moodStorage') as typeof import('../../storage/moodStorage');
  resetEntriesStorageSessionStateForTests();
}

describe('sqlite mood entries persistence', () => {
  beforeEach(async () => {
    jest.resetModules();
    await getAsyncStorage().clear();
    resetSqliteTestHarness();
  });

  it('imports legacy AsyncStorage blob into mood_entries on bootstrap', async () => {
    const record = generateSyntheticMoodEntries(5);
    await getAsyncStorage().setItem(STORAGE_KEY, JSON.stringify(record));

    const { ensureLocalPersistenceReady } = require('../bootstrap') as typeof import('../bootstrap');
    await ensureLocalPersistenceReady();

    const { ensureKairoSqliteReady } = require('./database') as typeof import('./database');
    const { countMoodEntries, loadAllMoodEntriesFromSqlite } =
      require('./moodEntriesStore') as typeof import('./moodEntriesStore');
    const db = await ensureKairoSqliteReady();
    expect(await countMoodEntries(db)).toBe(5);
    expect(Object.keys(await loadAllMoodEntriesFromSqlite(db))).toHaveLength(5);

    const { getAllEntries } = require('../../storage/moodStorage') as typeof import('../../storage/moodStorage');
    const loaded = await getAllEntries();
    expect(Object.keys(loaded)).toHaveLength(5);
    expect(loaded['2016-01-01']?.mood).toBe('A+');

    const backendFlag = await getAsyncStorage().getItem('kairo.entries.backend');
    expect(backendFlag).toBe('sqlite');
  });

  it('upsert and delete single rows without rewriting full blob', async () => {
    const { ensureLocalPersistenceReady } = require('../bootstrap') as typeof import('../bootstrap');
    await ensureLocalPersistenceReady();

    const { upsertEntry, getEntry, deleteEntry, getAllEntries } =
      require('../../storage/moodStorage') as typeof import('../../storage/moodStorage');

    await upsertEntry({
      date: '2026-03-01',
      mood: 'B',
      note: 'sqlite row',
      createdAt: 1,
      updatedAt: 1,
    });
    expect((await getEntry('2026-03-01'))?.note).toBe('sqlite row');

    await deleteEntry('2026-03-01');
    expect(await getEntry('2026-03-01')).toBeNull();
    expect(Object.keys(await getAllEntries())).toHaveLength(0);
  });

  it('quarantines corrupt AsyncStorage JSON before sqlite import path', async () => {
    await getAsyncStorage().setItem(STORAGE_KEY, '{not json');
    process.env.KAIRO_ENTRIES_BACKEND = 'async';

    const { getAllEntries } = require('../../storage/moodStorage') as typeof import('../../storage/moodStorage');
    const loaded = await getAllEntries();
    expect(loaded).toEqual({});

    delete process.env.KAIRO_ENTRIES_BACKEND;
  });

  it('preserves write-lock serialization under sqlite backend', async () => {
    const { ensureLocalPersistenceReady } = require('../bootstrap') as typeof import('../bootstrap');
    await ensureLocalPersistenceReady();

    const { upsertEntry, getAllEntries } = require('../../storage/moodStorage') as typeof import('../../storage/moodStorage');

    await Promise.all([
      upsertEntry({ date: '2026-04-01', mood: 'A', note: 'a', createdAt: 1, updatedAt: 1 }),
      upsertEntry({ date: '2026-04-02', mood: 'B', note: 'b', createdAt: 2, updatedAt: 2 }),
    ]);

    const all = await getAllEntries();
    expect(Object.keys(all)).toHaveLength(2);
  });
});
