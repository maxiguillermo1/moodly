/**
 * Extension *values* (per-day stores) must survive turning features off in settings.
 */

const HABIT_SELECTIONS_KEY = 'moodly.habitSelections';
const DAY_TODOS_KEY = 'moodly.dayTodos';
const dayShardKey = (date: string) => `moodly.tasks.day.${date}`;

describe('extension persistence vs settings toggles', () => {
  beforeEach(async () => {
    (globalThis as any).__MOODLY_CHAOS__ = undefined;
    jest.resetModules();
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.clear();
  });

  it('disabling habits in settings does not erase saved day selections', async () => {
    const habitSelections = require('./habitSelectionsStorage') as typeof import('./habitSelectionsStorage');
    const settingsStorage = require('./settingsStorage') as typeof import('./settingsStorage');

    await habitSelections.toggleHabitForDate('2026-05-10', 'workout');
    expect(await habitSelections.getHabitSelectionsForDate('2026-05-10')).toContain('workout');

    await settingsStorage.setHabitsEnabled(false);
    expect(await habitSelections.getHabitSelectionsForDate('2026-05-10')).toContain('workout');

    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    const raw = await AsyncStorage.getItem(HABIT_SELECTIONS_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.selections['2026-05-10']).toEqual(['workout']);
  });

  it('corrupt per-day habit selections are quarantined and reset safely', async () => {
    const habitSelections = require('./habitSelectionsStorage') as typeof import('./habitSelectionsStorage');
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.setItem(HABIT_SELECTIONS_KEY, 'not-json');

    await expect(habitSelections.getHabitSelectionsForDate('2026-05-10')).resolves.toEqual([]);
    expect(await AsyncStorage.getItem(HABIT_SELECTIONS_KEY)).toBe(
      JSON.stringify({ v: 3, selections: {}, toggleTotals: {} })
    );
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((k: string) => k.startsWith(`${HABIT_SELECTIONS_KEY}.corrupt.`))).toBe(true);
  });

  it('disabling reminders in settings does not erase saved day todos', async () => {
    const dayTodos = require('./dayTodosStorage') as typeof import('./dayTodosStorage');
    const settingsStorage = require('./settingsStorage') as typeof import('./settingsStorage');

    await dayTodos.addDayTodo('2026-05-11', 'water plants');
    await settingsStorage.setTodayTodoEnabled(false);
    await settingsStorage.setTodayTodoEnabled(true);

    expect((await dayTodos.getDayTodosForDate('2026-05-11')).map((item) => item.title)).toEqual(['water plants']);
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    const legacy = await AsyncStorage.getItem(DAY_TODOS_KEY);
    expect(legacy).toBeNull();
    const parsed = JSON.parse((await AsyncStorage.getItem(dayShardKey('2026-05-11')))!);
    expect(parsed.some((item: any) => item.title === 'water plants')).toBe(true);
  });

  it('extension order bumping is deterministic when features are re-enabled', async () => {
    const settingsStorage = require('./settingsStorage') as typeof import('./settingsStorage');

    await settingsStorage.setHabitsEnabled(true);
    await settingsStorage.setTodayTodoEnabled(true);
    await settingsStorage.setTodayGoalsEnabled(true);

    expect((await settingsStorage.getSettings()).todayExtensionsOrder).toEqual(['habits', 'todo', 'goals']);
  });

  it('marked-day counts: at most one per local day; off removes that day', async () => {
    const habitSelections = require('./habitSelectionsStorage') as typeof import('./habitSelectionsStorage');
    await habitSelections.toggleHabitForDate('2026-05-20', 'workout');
    expect(await habitSelections.getHabitMarkedDayCounts()).toMatchObject({ workout: 1 });
    await habitSelections.toggleHabitForDate('2026-05-20', 'workout');
    expect(await habitSelections.getHabitSelectionsForDate('2026-05-20')).toEqual([]);
    expect(await habitSelections.getHabitMarkedDayCounts()).toEqual({});
    await habitSelections.toggleHabitForDate('2026-05-20', 'workout');
    await habitSelections.toggleHabitForDate('2026-05-20', 'workout');
    await habitSelections.toggleHabitForDate('2026-05-20', 'workout');
    expect(await habitSelections.getHabitMarkedDayCounts()).toMatchObject({ workout: 1 });
    await habitSelections.toggleHabitForDate('2026-05-21', 'workout');
    expect(await habitSelections.getHabitMarkedDayCounts()).toMatchObject({ workout: 2 });
  });

  it('migrates v2 disk to v3 and drops legacy onCounts (counts come from selections only)', async () => {
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.setItem(
      HABIT_SELECTIONS_KEY,
      JSON.stringify({
        v: 2,
        selections: { '2026-01-01': ['workout'], '2026-01-02': ['workout'] },
        onCounts: {
          '2026-01-01': { workout: 99 },
        },
      })
    );
    const habitSelections = require('./habitSelectionsStorage') as typeof import('./habitSelectionsStorage');
    expect(await habitSelections.getHabitMarkedDayCounts()).toMatchObject({ workout: 2 });
    const raw = await AsyncStorage.getItem(HABIT_SELECTIONS_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.v).toBe(3);
    expect(parsed.toggleTotals).toEqual({});
    expect(parsed.selections['2026-01-01']).toEqual(['workout']);
  });

  it('strips legacy v3 toggleTotals on read (counts stay selection-derived)', async () => {
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.setItem(
      HABIT_SELECTIONS_KEY,
      JSON.stringify({
        v: 3,
        selections: { '2026-03-01': ['workout'] },
        toggleTotals: { workout: 500 },
      })
    );
    const habitSelections = require('./habitSelectionsStorage') as typeof import('./habitSelectionsStorage');
    expect(await habitSelections.getHabitMarkedDayCounts()).toMatchObject({ workout: 1 });
    const raw = await AsyncStorage.getItem(HABIT_SELECTIONS_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.toggleTotals).toEqual({});
  });

  it('tracked habit visibility does not erase per-day habit selections', async () => {
    const habitSelections = require('./habitSelectionsStorage') as typeof import('./habitSelectionsStorage');
    const habitTracking = require('./habitTrackingStorage') as typeof import('./habitTrackingStorage');

    await habitSelections.toggleHabitForDate('2026-05-12', 'workout');
    await habitTracking.setTrackedHabitIds([]);

    expect(await habitSelections.getHabitSelectionsForDate('2026-05-12')).toEqual(['workout']);
    expect(await habitTracking.getTrackedHabitIds()).toEqual([]);
  });
});
