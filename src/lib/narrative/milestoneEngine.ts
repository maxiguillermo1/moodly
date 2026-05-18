/**
 * @fileoverview **Milestones** — longest journal note streak in-window (structural).
 * @module lib/narrative/milestoneEngine
 */

import type { LocalDateKey } from '../../types/dailyActivity.types';
import { longestStreakOverSortedDates } from '../insights/trendCalculators';
import type { DaySignalRow } from './daySignals';

export function longestJournalNoteStreak(rows: readonly DaySignalRow[]): number {
  const dates: LocalDateKey[] = rows.map((r) => r.date);
  const set = new Set(rows.filter((r) => r.journalNote).map((r) => r.date));
  return longestStreakOverSortedDates(dates, (d) => set.has(d));
}

export function journalStreakMilestoneEligible(longest: number, windowDays: number): boolean {
  return windowDays >= 28 && longest >= 10;
}
