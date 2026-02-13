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
    expect(res.monthCardMatchesScreenBackground).toBe(false);
    const after = await AsyncStorage.getItem(SETTINGS_KEY);
    expect(after).toBe(JSON.stringify({ calendarMoodStyle: 'dot', monthCardMatchesScreenBackground: false }));
  });
});

