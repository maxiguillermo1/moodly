/**
 * @fileoverview Persisted app settings (AsyncStorage) (data layer source of truth)
 * @module data/storage/settingsStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, CalendarMoodStyle } from '../../types';
import { devTimeAsync } from '../../lib/utils/devPerf';
import { logger } from '../../lib/security/logger';

const SETTINGS_KEY = 'moodly.settings';
const CORRUPT_PREFIX = `${SETTINGS_KEY}.corrupt.`;

const DEFAULT_SETTINGS: AppSettings = {
  calendarMoodStyle: 'dot',
  monthCardMatchesScreenBackground: false,
};

let settingsCache: AppSettings | null = null;
let settingsLoadPromise: Promise<AppSettings> | null = null;

function safeParseSettings(json: string | null): AppSettings {
  if (!json) return DEFAULT_SETTINGS;
  try {
    const raw = JSON.parse(json) as any;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_SETTINGS;

    const calendarMoodStyle =
      raw.calendarMoodStyle === 'dot' || raw.calendarMoodStyle === 'fill'
        ? (raw.calendarMoodStyle as CalendarMoodStyle)
        : DEFAULT_SETTINGS.calendarMoodStyle;

    const monthCardMatchesScreenBackground =
      typeof raw.monthCardMatchesScreenBackground === 'boolean'
        ? raw.monthCardMatchesScreenBackground
        : DEFAULT_SETTINGS.monthCardMatchesScreenBackground;

    return { ...DEFAULT_SETTINGS, calendarMoodStyle, monthCardMatchesScreenBackground };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function quarantineCorruptValue(rawJson: string): Promise<void> {
  const ts = Date.now();
  const backupKey = `${CORRUPT_PREFIX}${ts}`;
  try {
    await AsyncStorage.setItem(backupKey, rawJson);
  } catch (e) {
    logger.warn('[settingsStorage] Failed to persist corrupt backup', e);
  }
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  } catch (e) {
    logger.error('[settingsStorage] Failed to reset corrupt settings', e);
  }
}

export async function getSettings(): Promise<AppSettings> {
  try {
    if (settingsCache) return settingsCache;
    if (settingsLoadPromise) return settingsLoadPromise;

    settingsLoadPromise = (async () => {
      const json = await devTimeAsync('[storage] getSettings.getItem', () =>
        AsyncStorage.getItem(SETTINGS_KEY)
      );
      const next = safeParseSettings(json);

      // If JSON exists but parsing yields defaults, quarantine to avoid repeated weird states.
      if (typeof json === 'string' && json.length > 0) {
        try {
          const parsed = JSON.parse(json) as any;
          const isObject = parsed && typeof parsed === 'object' && !Array.isArray(parsed);
          const keyCount = isObject ? Object.keys(parsed).length : 0;
          const hasValidStyle =
            isObject && (parsed.calendarMoodStyle === 'dot' || parsed.calendarMoodStyle === 'fill');

          // Treat an empty object `{}` as a benign "defaults" case; don't quarantine to avoid pointless writes.
          if (keyCount > 0 && !hasValidStyle) {
            logger.warn('[settingsStorage] Corrupt settings detected; quarantining and resetting');
            await quarantineCorruptValue(json);
          }
        } catch {
          logger.warn('[settingsStorage] Corrupt settings detected; quarantining and resetting');
          await quarantineCorruptValue(json);
        }
      }

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
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const style = (next as any)?.calendarMoodStyle;
    if (style !== 'dot' && style !== 'fill') {
      throw new Error(`[settingsStorage.setSettings] Invalid calendarMoodStyle: ${String(style)}`);
    }
    const monthBg = (next as any)?.monthCardMatchesScreenBackground;
    if (typeof monthBg !== 'boolean') {
      throw new Error(
        `[settingsStorage.setSettings] Invalid monthCardMatchesScreenBackground: ${String(monthBg)}`
      );
    }
  }

  settingsCache = next;
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

export async function setCalendarMoodStyle(style: CalendarMoodStyle): Promise<void> {
  const current = await getSettings();
  await setSettings({ ...current, calendarMoodStyle: style });
}

export async function setMonthCardMatchesScreenBackground(enabled: boolean): Promise<void> {
  const current = await getSettings();
  await setSettings({ ...current, monthCardMatchesScreenBackground: enabled });
}
