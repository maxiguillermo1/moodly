/**
 * @fileoverview Persisted app settings (AsyncStorage) (data layer source of truth)
 * @module data/storage/settingsStorage
 */

import { AppSettings, CalendarMoodStyle, MoodGradeColorStyle } from '../../types';
import { logger } from '../../lib/security/logger';
import { storage } from './asyncStorage';

const SETTINGS_KEY = 'moodly.settings';
const CORRUPT_PREFIX = `${SETTINGS_KEY}.corrupt.`;

const DEFAULT_SETTINGS: AppSettings = {
  appearance: 'system',
  calendarMoodStyle: 'dot',
  moodGradeColorStyle: 'solid',
};

let settingsCache: AppSettings | null = null;
let settingsLoadPromise: Promise<AppSettings> | null = null;

/**
 * Write serialization (reliability).
 *
 * Settings are mutated from UI switches which can be spammed.
 * Without a lock, overlapping writes can race and end in stale values.
 */
let settingsWriteTail: Promise<void> = Promise.resolve();
async function withSettingsWriteLock<T>(op: () => Promise<T>): Promise<T> {
  const prev = settingsWriteTail;
  let release!: () => void;
  settingsWriteTail = new Promise<void>((r) => {
    release = r;
  });
  await prev;
  try {
    return await op();
  } finally {
    release();
  }
}

function safeParseSettings(json: string | null): AppSettings {
  if (!json) return DEFAULT_SETTINGS;
  try {
    const raw = JSON.parse(json) as any;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_SETTINGS;
    const appearance: AppSettings['appearance'] =
      raw.appearance === 'light' || raw.appearance === 'dark' || raw.appearance === 'system'
        ? raw.appearance
        : DEFAULT_SETTINGS.appearance;
    const calendarMoodStyle =
      raw.calendarMoodStyle === 'dot' || raw.calendarMoodStyle === 'fill'
        ? (raw.calendarMoodStyle as CalendarMoodStyle)
        : DEFAULT_SETTINGS.calendarMoodStyle;
    const moodGradeColorStyle: MoodGradeColorStyle =
      raw.moodGradeColorStyle === 'gradient' || raw.moodGradeColorStyle === 'solid'
        ? raw.moodGradeColorStyle
        : DEFAULT_SETTINGS.moodGradeColorStyle;
    return { ...DEFAULT_SETTINGS, appearance, calendarMoodStyle, moodGradeColorStyle };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function quarantineCorruptValue(rawJson: string): Promise<void> {
  const ts = Date.now();
  const backupKey = `${CORRUPT_PREFIX}${ts}`;
  try {
    await storage.setItem(backupKey, rawJson);
  } catch (e) {
    logger.warn('storage.settings.corruptBackup.persistFailed', { key: SETTINGS_KEY, error: e });
  }
  try {
    await storage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  } catch (e) {
    logger.error('storage.settings.corruptReset.failed', { key: SETTINGS_KEY, error: e });
  }
}

export async function getSettings(): Promise<AppSettings> {
  try {
    if (settingsCache) return settingsCache;
    if (settingsLoadPromise) return settingsLoadPromise;

    settingsLoadPromise = (async () => {
      const json = await logger.perfMeasure(
        'storage.getSettings.getItem',
        { phase: 'cold', source: 'storage' },
        async () => {
          return storage.getItem(SETTINGS_KEY);
        }
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
          const moodGradeOk =
            parsed.moodGradeColorStyle === undefined ||
            parsed.moodGradeColorStyle === 'solid' ||
            parsed.moodGradeColorStyle === 'gradient';
          // Treat an empty object `{}` as a benign "defaults" case; don't quarantine to avoid pointless writes.
          const appearanceOk =
            isObject &&
            (parsed.appearance === undefined ||
              parsed.appearance === 'system' ||
              parsed.appearance === 'light' ||
              parsed.appearance === 'dark');
          if (keyCount > 0 && (!hasValidStyle || !appearanceOk || !moodGradeOk)) {
            logger.warn('storage.settings.corrupt.detected', { key: SETTINGS_KEY, action: 'quarantineAndReset' });
            await quarantineCorruptValue(json);
          }
        } catch {
          logger.warn('storage.settings.corrupt.detected', { key: SETTINGS_KEY, action: 'quarantineAndReset' });
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
  return withSettingsWriteLock(async () => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const style = (next as any)?.calendarMoodStyle;
      if (style !== 'dot' && style !== 'fill') {
        throw new Error(`[settingsStorage.setSettings] Invalid calendarMoodStyle: ${String(style)}`);
      }
      const appearance = (next as any)?.appearance;
      if (
        appearance !== 'system' &&
        appearance !== 'light' &&
        appearance !== 'dark'
      ) {
        throw new Error(`[settingsStorage.setSettings] Invalid appearance: ${String(appearance)}`);
      }
      const mg = (next as any)?.moodGradeColorStyle;
      if (mg !== 'solid' && mg !== 'gradient') {
        throw new Error(`[settingsStorage.setSettings] Invalid moodGradeColorStyle: ${String(mg)}`);
      }
    }
    try {
      // Persist first. Only update RAM cache after the write succeeds.
      await storage.setItem(SETTINGS_KEY, JSON.stringify(next));
      settingsCache = next;
    } catch (error) {
      logger.error('storage.settings.set.failed', { key: SETTINGS_KEY, error });
      throw error;
    }
  });
}

export async function setCalendarMoodStyle(style: CalendarMoodStyle): Promise<void> {
  const current = await getSettings();
  await setSettings({ ...current, calendarMoodStyle: style });
}

export async function setAppearancePreference(mode: AppSettings['appearance']): Promise<void> {
  const current = await getSettings();
  await setSettings({ ...current, appearance: mode });
}

export async function setMoodGradeColorStyle(style: MoodGradeColorStyle): Promise<void> {
  const current = await getSettings();
  await setSettings({ ...current, moodGradeColorStyle: style });
}
