/**
 * @fileoverview One IO round-trip for calendar surfaces: mood index + display settings.
 * @module data/storage/calendarSnapshot
 */

import type { MoodEntry } from '../../types';
import type { CalendarMoodStyle } from '../../types/settings.types';
import {
  getCalendarEntriesByMonthIndexSnapshot,
  getEntriesSessionEpoch,
  peekCalendarEntriesByMonthIndexFromSessionCache,
} from './moodStorage';
import { getSettings, getSettingsSessionEpoch, peekSettingsCache } from './settingsStorage';

export type MoodCalendarSnapshot = {
  byMonthKey: Record<string, Record<string, MoodEntry>>;
  calendarMoodStyle: CalendarMoodStyle;
};

export type MoodCalendarSnapshotEpoch = {
  entries: number;
  settings: number;
};

/** @internal Coalesce overlapping reads (rapid tab switches / month + year). */
let moodCalendarSnapshotInflight: Promise<MoodCalendarSnapshot> | null = null;

/** Warm RAM snapshot — invalidated when entries or settings session epochs change. */
let moodCalendarSnapshotWarm: MoodCalendarSnapshot | null = null;
let moodCalendarSnapshotWarmEpoch: MoodCalendarSnapshotEpoch | null = null;

export function getMoodCalendarSnapshotEpoch(): MoodCalendarSnapshotEpoch {
  return {
    entries: getEntriesSessionEpoch(),
    settings: getSettingsSessionEpoch(),
  };
}

function moodCalendarSnapshotEpochsEqual(
  a: MoodCalendarSnapshotEpoch,
  b: MoodCalendarSnapshotEpoch
): boolean {
  return a.entries === b.entries && a.settings === b.settings;
}

/** Drop warm calendar snapshot (tests / import reset). */
export function invalidateMoodCalendarSnapshotWarmCacheForTests(): void {
  moodCalendarSnapshotWarm = null;
  moodCalendarSnapshotWarmEpoch = null;
  moodCalendarSnapshotInflight = null;
}

/**
 * Sync read when warm RAM snapshot matches current session epochs.
 * Returns `undefined` when not ready — caller should fall back to async fetch.
 */
export function peekMoodCalendarSnapshotFromWarmCache(): MoodCalendarSnapshot | undefined {
  const epoch = getMoodCalendarSnapshotEpoch();
  if (
    moodCalendarSnapshotWarm &&
    moodCalendarSnapshotWarmEpoch &&
    moodCalendarSnapshotEpochsEqual(epoch, moodCalendarSnapshotWarmEpoch)
  ) {
    return moodCalendarSnapshotWarm;
  }
  return undefined;
}

/**
 * Build warm calendar snapshot when entries + settings are already in RAM (no disk I/O).
 * Safe to call from post-interaction idle hooks after `primeEntriesSessionCache`.
 */
export function warmMoodCalendarSnapshotCacheIfPrimed(): void {
  const byMonthKey = peekCalendarEntriesByMonthIndexFromSessionCache();
  const settings = peekSettingsCache();
  if (!byMonthKey || !settings) return;
  moodCalendarSnapshotWarm = {
    byMonthKey: byMonthKey as Record<string, Record<string, MoodEntry>>,
    calendarMoodStyle: settings.calendarMoodStyle,
  };
  moodCalendarSnapshotWarmEpoch = getMoodCalendarSnapshotEpoch();
}

export async function fetchMoodCalendarSnapshot(): Promise<MoodCalendarSnapshot> {
  const epoch = getMoodCalendarSnapshotEpoch();
  if (
    moodCalendarSnapshotWarm &&
    moodCalendarSnapshotWarmEpoch &&
    moodCalendarSnapshotEpochsEqual(epoch, moodCalendarSnapshotWarmEpoch)
  ) {
    return moodCalendarSnapshotWarm;
  }

  if (moodCalendarSnapshotInflight) return moodCalendarSnapshotInflight;

  moodCalendarSnapshotInflight = (async () => {
    try {
      const [byMonthKey, settings] = await Promise.all([
        getCalendarEntriesByMonthIndexSnapshot(),
        getSettings(),
      ]);
      const snapshot: MoodCalendarSnapshot = {
        byMonthKey: byMonthKey as Record<string, Record<string, MoodEntry>>,
        calendarMoodStyle: settings.calendarMoodStyle,
      };
      moodCalendarSnapshotWarm = snapshot;
      moodCalendarSnapshotWarmEpoch = getMoodCalendarSnapshotEpoch();
      return snapshot;
    } finally {
      moodCalendarSnapshotInflight = null;
    }
  })();
  return moodCalendarSnapshotInflight;
}
