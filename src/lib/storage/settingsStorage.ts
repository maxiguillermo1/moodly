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

export async function getSettings(): Promise<AppSettings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!json) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(json) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setSettings(next: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

export async function setCalendarMoodStyle(style: CalendarMoodStyle): Promise<void> {
  const current = await getSettings();
  await setSettings({ ...current, calendarMoodStyle: style });
}

