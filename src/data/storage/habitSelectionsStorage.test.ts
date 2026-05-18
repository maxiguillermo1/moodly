/**
 * @fileoverview Habit selections + derived marked-day counts (storage contract).
 * @module data/storage/habitSelectionsStorage.test
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { resetPersistenceBootstrapForTests } from '../persistence/bootstrap';
import {
  clearAllHabitSelections,
  getHabitMarkedDayCounts,
  getHabitSelectionsForDate,
  resetHabitSelectionsStorageSessionStateForTests,
  toggleHabitForDate,
} from './habitSelectionsStorage';

const KEY = 'moodly.habitSelections';

describe('habitSelectionsStorage', () => {
  beforeEach(async () => {
    (globalThis as any).__MOODLY_CHAOS__ = undefined;
    await AsyncStorage.clear();
    resetPersistenceBootstrapForTests();
    resetHabitSelectionsStorageSessionStateForTests();
  });

  it('dedupes duplicate ids in the same day and normalizes catalog order on read', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        v: 3,
        selections: { '2026-06-01': ['workout', 'workout', 'read_book', 'workout'] },
        toggleTotals: {},
      })
    );
    expect(await getHabitSelectionsForDate('2026-06-01')).toEqual(['workout', 'read_book']);
    expect(await getHabitMarkedDayCounts()).toMatchObject({ workout: 1, read_book: 1 });
  });

  it('counts one per day across three dates', async () => {
    await toggleHabitForDate('2026-06-10', 'meditate');
    await toggleHabitForDate('2026-06-11', 'meditate');
    await toggleHabitForDate('2026-06-12', 'meditate');
    expect(await getHabitMarkedDayCounts()).toMatchObject({ meditate: 3 });
  });

  it('multiple habits on the same day each gain one marked day', async () => {
    await toggleHabitForDate('2026-06-15', 'workout');
    await toggleHabitForDate('2026-06-15', 'read_book');
    expect(await getHabitMarkedDayCounts()).toMatchObject({ workout: 1, read_book: 1 });
  });

  it('drops empty day rows and does not count them', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        v: 3,
        selections: { '2026-06-20': [], '2026-06-21': ['workout'] },
        toggleTotals: {},
      })
    );
    expect(await getHabitSelectionsForDate('2026-06-20')).toEqual([]);
    expect(await getHabitMarkedDayCounts()).toMatchObject({ workout: 1 });
  });

  it('ignores invalid date keys and unknown habit strings', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        v: 3,
        selections: {
          'not-a-date': ['workout'],
          '2026-06-22': ['workout', 'bogus_habit_x'],
        },
        toggleTotals: {},
      })
    );
    expect(await getHabitMarkedDayCounts()).toMatchObject({ workout: 1 });
  });

  it('forward-migrates unknown version envelopes with recoverable selections', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        v: 99,
        selections: { '2026-07-01': ['drink_water'] },
        extraField: true,
      })
    );
    expect(await getHabitMarkedDayCounts()).toMatchObject({ drink_water: 1 });
    const parsed = JSON.parse((await AsyncStorage.getItem(KEY))!);
    expect(parsed.v).toBe(3);
    expect(parsed.toggleTotals).toEqual({});
  });

  it('treats unknown version without selections as corrupt and resets', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ v: 99, toggleTotals: { workout: 1 } }));
    await expect(getHabitSelectionsForDate('2026-08-01')).resolves.toEqual([]);
    const parsed = JSON.parse((await AsyncStorage.getItem(KEY))!);
    expect(parsed.v).toBe(3);
    expect(parsed.selections).toEqual({});
  });

  it('migration from v2 is idempotent and strips toggleTotals on disk', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({
        v: 2,
        selections: { '2026-09-01': ['journaling'] },
        onCounts: { '2026-09-01': { journaling: 50 } },
      })
    );
    await getHabitMarkedDayCounts();
    const pass1 = JSON.parse((await AsyncStorage.getItem(KEY))!);
    expect(pass1.v).toBe(3);
    expect(pass1.toggleTotals).toEqual({});
    await getHabitMarkedDayCounts();
    const pass2 = JSON.parse((await AsyncStorage.getItem(KEY))!);
    expect(pass2).toEqual(pass1);
  });

  it('toggle is deterministic for repeated on/off cycles', async () => {
    await toggleHabitForDate('2026-10-01', 'early_wake');
    await toggleHabitForDate('2026-10-01', 'early_wake');
    await toggleHabitForDate('2026-10-01', 'early_wake');
    expect(await getHabitSelectionsForDate('2026-10-01')).toEqual(['early_wake']);
    expect(await getHabitMarkedDayCounts()).toMatchObject({ early_wake: 1 });
  });

  it('deriveMarkedDayCounts scales linearly with day keys (smoke)', async () => {
    const selections: Record<string, string[]> = {};
    const months = [1, 3, 5, 7];
    let c = 0;
    for (const m of months) {
      for (let d = 1; d <= 31 && c < 120; d++) {
        selections[`2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`] = ['workout'];
        c++;
      }
    }
    await AsyncStorage.setItem(KEY, JSON.stringify({ v: 3, selections, toggleTotals: {} }));
    resetHabitSelectionsStorageSessionStateForTests();
    const t0 = Date.now();
    const counts = await getHabitMarkedDayCounts();
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(counts.workout).toBe(120);
  });

  it('clearAllHabitSelections wipes selections and yields empty derived counts', async () => {
    await toggleHabitForDate('2026-12-01', 'no_junk_food');
    await clearAllHabitSelections();
    expect(await getHabitMarkedDayCounts()).toEqual({});
  });
});
