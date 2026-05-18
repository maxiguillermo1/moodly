/**
 * @fileoverview One IO round-trip for calendar surfaces: mood index + display settings.
 * @module data/storage/calendarSnapshot
 */

import type { MoodEntry } from '../../types';
import type { CalendarMoodStyle } from '../../types/settings.types';
import { getCalendarEntriesByMonthIndexSnapshot } from './moodStorage';
import { getSettings } from './settingsStorage';

export type MoodCalendarSnapshot = {
  byMonthKey: Record<string, Record<string, MoodEntry>>;
  calendarMoodStyle: CalendarMoodStyle;
};

/** Coalesce overlapping reads (rapid tab switches / nested month+year both asking for the same snapshot). */
let moodCalendarSnapshotInflight: Promise<MoodCalendarSnapshot> | null = null;

export async function fetchMoodCalendarSnapshot(): Promise<MoodCalendarSnapshot> {
  if (moodCalendarSnapshotInflight) return moodCalendarSnapshotInflight;
  moodCalendarSnapshotInflight = (async () => {
    try {
      const [byMonthKey, settings] = await Promise.all([
        getCalendarEntriesByMonthIndexSnapshot(),
        getSettings(),
      ]);
      return {
        byMonthKey: byMonthKey as Record<string, Record<string, MoodEntry>>,
        calendarMoodStyle: settings.calendarMoodStyle,
      };
    } finally {
      moodCalendarSnapshotInflight = null;
    }
  })();
  return moodCalendarSnapshotInflight;
}
