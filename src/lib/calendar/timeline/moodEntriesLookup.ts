/**
 * @fileoverview Mood entries map accessors for calendar month rows (no React).
 * @module lib/calendar/timeline/moodEntriesLookup
 */

import type { MoodEntry } from '../../../types';

export const EMPTY_MONTH_ENTRIES: Readonly<Record<string, MoodEntry>> = Object.freeze({});

export function getMonthEntriesFromNestedMap(
  entriesByMonthKey: Record<string, Record<string, MoodEntry>>,
  monthKey: string
): Record<string, MoodEntry> {
  return entriesByMonthKey[monthKey] ?? (EMPTY_MONTH_ENTRIES as Record<string, MoodEntry>);
}
