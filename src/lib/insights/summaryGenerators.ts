/**
 * @fileoverview Aggregates **PeriodMetrics** from `DayActivity` + goals (deterministic).
 * @module lib/insights/summaryGenerators
 */

import type { DayActivity } from '../../types/dailyActivity.types';
import type { LocalDateKey } from '../../types/dailyActivity.types';
import type { Goal } from '../../types/goals.types';
import type { PeriodMetrics } from '../../types/insights.types';
import { countDays, maxMoodLoggingStreak } from './trendCalculators';

export function countGoalProgressDaysInRange(
  goals: readonly Goal[],
  start: LocalDateKey,
  end: LocalDateKey
): number {
  const days = new Set<LocalDateKey>();
  for (const g of goals) {
    if (g.status !== 'active') continue;
    for (const h of g.history) {
      if (typeof h.date !== 'string') continue;
      if (h.value <= 0) continue;
      if (h.date >= start && h.date <= end) days.add(h.date);
    }
  }
  return days.size;
}

export function countRemindersMarkedDone(activities: Readonly<Record<string, DayActivity>>): number {
  let n = 0;
  for (const k of Object.keys(activities)) {
    const row = activities[k];
    if (!row) continue;
    for (const it of row.reminders.items) {
      if (it.done) n += 1;
    }
  }
  return n;
}

export function buildPeriodMetrics(
  activities: Readonly<Record<string, DayActivity>>,
  goals: readonly Goal[],
  start: LocalDateKey,
  end: LocalDateKey
): PeriodMetrics {
  const daysInPeriod = Object.keys(activities).length;
  const daysWithMoodEntry = countDays(activities, (row) => row.mood.hasEntry);
  const daysWithJournalNote = countDays(activities, (row) => row.journal.present);
  const daysWithAnyActivity = countDays(activities, (row) => row.summary.hasAnyActivity);
  const daysWithHabitOn = countDays(activities, (row) => row.habits.selectedIds.length > 0);
  const maxMoodStreak = maxMoodLoggingStreak(activities);
  const goalProgressDays = countGoalProgressDaysInRange(goals, start, end);
  const remindersMarkedDone = countRemindersMarkedDone(activities);

  return {
    daysInPeriod,
    daysWithMoodEntry,
    daysWithJournalNote,
    daysWithAnyActivity,
    daysWithHabitOn,
    maxMoodLoggingStreak: maxMoodStreak,
    goalProgressDays,
    remindersMarkedDone,
  };
}
