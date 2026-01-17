/**
 * @fileoverview Persisted app settings (AsyncStorage)
 * @module lib/storage/settingsStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, CalendarMoodStyle } from '../../types';

const SETTINGS_KEY = 'moodly.settings';

const DEFAULT_SETTINGS: AppSettings = {
  calendarMoodStyle: 'dot',
};

let settingsCache: AppSettings | null = null;
let settingsLoadPromise: Promise<AppSettings> | null = null;

export async function getSettings(): Promise<AppSettings> {
  try {
    if (settingsCache) return settingsCache;
    if (settingsLoadPromise) return settingsLoadPromise;

    settingsLoadPromise = (async () => {
      const json = await AsyncStorage.getItem(SETTINGS_KEY);
      const next = json
        ? { ...DEFAULT_SETTINGS, ...(JSON.parse(json) as Partial<AppSettings>) }
        : DEFAULT_SETTINGS;
      settingsCache = next;
      return next;
    })();

    const res = await settingsLoadPromise;
    settingsLoadPromise = null;
    return res;
  } catch {
    settingsLoadPromise = null;
    return DEFAULT_SETTINGS;
  }
}

export async function setSettings(next: AppSettings): Promise<void> {
  settingsCache = next;
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

export async function setCalendarMoodStyle(style: CalendarMoodStyle): Promise<void> {
  const current = await getSettings();
  await setSettings({ ...current, calendarMoodStyle: style });
}

