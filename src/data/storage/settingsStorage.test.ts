const SETTINGS_KEY = 'moodly.settings';

describe('settingsStorage corrupt JSON handling', () => {
  beforeEach(async () => {
    (globalThis as any).__MOODLY_CHAOS__ = undefined;
    jest.resetModules();
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.clear();
  });

  it('corrupt settings JSON is quarantined/reset to defaults (#13, #20)', async () => {
    const { getSettings } = require('./settingsStorage') as typeof import('./settingsStorage');
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.setItem(SETTINGS_KEY, '{not json');
    const res = await getSettings();
    expect(res.calendarMoodStyle).toBe('dot');
    expect(res.appearance).toBe('system');
    expect(res.moodGradeColorStyle).toBe('solid');
    const after = await AsyncStorage.getItem(SETTINGS_KEY);
    expect(after).toBe(
      JSON.stringify({
        appearance: 'system',
        calendarMoodStyle: 'dot',
        moodGradeColorStyle: 'solid',
        habitsEnabled: false,
        todayGoalsEnabled: false,
        todayTodoEnabled: false,
        todayExtensionsOrder: ['habits', 'goals', 'todo'],
      })
    );
  });

  it('setSettings round-trips after simulated cold session (disk intact)', async () => {
    const settings = require('./settingsStorage') as typeof import('./settingsStorage');
    const { resetPersistenceBootstrapForTests } = require('../persistence/bootstrap');
    await settings.setSettings({
      appearance: 'dark',
      calendarMoodStyle: 'fill',
      moodGradeColorStyle: 'gradient',
      habitsEnabled: true,
      todayGoalsEnabled: false,
      todayTodoEnabled: true,
      todayExtensionsOrder: ['todo', 'habits', 'goals'],
    });
    const a = await settings.getSettings();
    expect(a.appearance).toBe('dark');
    expect(a.calendarMoodStyle).toBe('fill');
    expect(a.todayTodoEnabled).toBe(true);
    settings.resetSettingsStorageSessionStateForTests();
    resetPersistenceBootstrapForTests();
    const b = await settings.getSettings();
    expect(b.appearance).toBe('dark');
    expect(b.calendarMoodStyle).toBe('fill');
  });

  it('parses partial JSON with safe defaults for missing fields', async () => {
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        appearance: 'light',
        calendarMoodStyle: 'dot',
        // omit habitsEnabled, goals, todo, order, moodGradeColorStyle
      })
    );
    const settings = require('./settingsStorage') as typeof import('./settingsStorage');
    const { resetPersistenceBootstrapForTests } = require('../persistence/bootstrap');
    settings.resetSettingsStorageSessionStateForTests();
    resetPersistenceBootstrapForTests();
    const res = await settings.getSettings();
    expect(res.appearance).toBe('light');
    expect(res.habitsEnabled).toBe(false);
    expect(res.todayExtensionsOrder).toEqual(['habits', 'goals', 'todo']);
  });

  it('does not reset repairable partial settings that omit style fields', async () => {
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        appearance: 'dark',
        habitsEnabled: true,
        todayTodoEnabled: true,
      })
    );
    const settings = require('./settingsStorage') as typeof import('./settingsStorage');
    const { resetPersistenceBootstrapForTests } = require('../persistence/bootstrap');

    const first = await settings.getSettings();
    expect(first.appearance).toBe('dark');
    expect(first.habitsEnabled).toBe(true);
    expect(first.calendarMoodStyle).toBe('dot');

    settings.resetSettingsStorageSessionStateForTests();
    resetPersistenceBootstrapForTests();
    const second = await settings.getSettings();
    expect(second.appearance).toBe('dark');
    expect(second.habitsEnabled).toBe(true);
    expect(second.todayTodoEnabled).toBe(true);
  });

  it('serializes concurrent setting toggles without losing sibling changes', async () => {
    const settings = require('./settingsStorage') as typeof import('./settingsStorage');
    await Promise.all([
      settings.setHabitsEnabled(true),
      settings.setTodayGoalsEnabled(true),
      settings.setTodayTodoEnabled(true),
    ]);
    const res = await settings.getSettings();
    expect(res.habitsEnabled).toBe(true);
    expect(res.todayGoalsEnabled).toBe(true);
    expect(res.todayTodoEnabled).toBe(true);
    expect(new Set(res.todayExtensionsOrder)).toEqual(new Set(['habits', 'goals', 'todo']));
  });

  it('returns defensive copies so callers cannot mutate the session cache', async () => {
    const settings = require('./settingsStorage') as typeof import('./settingsStorage');
    await settings.setSettings({
      appearance: 'dark',
      calendarMoodStyle: 'fill',
      moodGradeColorStyle: 'gradient',
      habitsEnabled: true,
      todayGoalsEnabled: true,
      todayTodoEnabled: true,
      todayExtensionsOrder: ['todo', 'habits', 'goals'],
    });

    const first = await settings.getSettings();
    first.todayExtensionsOrder.reverse();
    first.appearance = 'light';

    const second = await settings.getSettings();
    expect(second.appearance).toBe('dark');
    expect(second.todayExtensionsOrder).toEqual(['todo', 'habits', 'goals']);
  });
});

