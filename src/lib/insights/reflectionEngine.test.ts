/**
 * @fileoverview Determinism + tone rules for `runReflectionEngine`.
 * @module lib/insights/reflectionEngine.test
 */

import type { DayActivity } from '../../types/dailyActivity.types';
import type { MoodGrade } from '../../types/mood.types';
import type { InsightPeriod, PeriodMetrics } from '../../types/insights.types';
import { runReflectionEngine } from './reflectionEngine';

function baseRow(date: string): DayActivity {
  return {
    date,
    mood: { present: false, grade: null, hasEntry: false },
    journal: { present: false, notePreview: '', updatedAt: null },
    habits: { selectedIds: [], trackedIds: [] },
    goals: { items: [] },
    reminders: { items: [] },
    calendar: { monthKey: date.slice(0, 7), hasMoodEntry: false, moodGrade: null },
    summary: {
      counts: { mood: 0, journalNote: 0, habits: 0, goalsWithProgress: 0, reminders: 0 },
      hasAnyActivity: false,
    },
    metadata: { composedAt: 1, date, warnings: [] },
  };
}

function withMood(row: DayActivity, grade: MoodGrade): DayActivity {
  return {
    ...row,
    mood: { present: true, grade, hasEntry: true },
    calendar: { ...row.calendar, hasMoodEntry: true, moodGrade: grade },
    summary: {
      counts: { mood: 1, journalNote: 0, habits: 0, goalsWithProgress: 0, reminders: 0 },
      hasAnyActivity: true,
    },
  };
}

function withHabit(row: DayActivity, id: 'read_book'): DayActivity {
  return {
    ...row,
    habits: { selectedIds: [id], trackedIds: [id] },
    summary: {
      ...row.summary,
      counts: { ...row.summary.counts, habits: 1 },
      hasAnyActivity: true,
    },
  };
}

describe('reflectionEngine', () => {
  const periodWeek: InsightPeriod = { kind: 'week', start: '2026-06-01', end: '2026-06-07' };

  it('empty week is deterministic and non-contradictory', () => {
    const activities: Record<string, DayActivity> = {};
    for (let i = 1; i <= 7; i++) {
      const d = `2026-06-0${i}`;
      activities[d] = baseRow(d);
    }
    const metrics: PeriodMetrics = {
      daysInPeriod: 7,
      daysWithMoodEntry: 0,
      daysWithJournalNote: 0,
      daysWithAnyActivity: 0,
      daysWithHabitOn: 0,
      maxMoodLoggingStreak: 0,
      goalProgressDays: 0,
      remindersMarkedDone: 0,
    };
    const a = runReflectionEngine({ period: periodWeek, activities, metrics, priorMetrics: null });
    const b = runReflectionEngine({ period: periodWeek, activities, metrics, priorMetrics: null });
    expect(a.map((x) => x.id).join('|')).toBe(b.map((x) => x.id).join('|'));
    expect(a.some((x) => x.messageKey === 'insights.empty.week_gentle')).toBe(true);
  });

  it('full mood week emits celebrate insight', () => {
    const activities: Record<string, DayActivity> = {};
    for (let i = 1; i <= 7; i++) {
      const d = `2026-06-0${i}`;
      activities[d] = withMood(baseRow(d), 'A');
    }
    const metrics: PeriodMetrics = {
      daysInPeriod: 7,
      daysWithMoodEntry: 7,
      daysWithJournalNote: 0,
      daysWithAnyActivity: 7,
      daysWithHabitOn: 0,
      maxMoodLoggingStreak: 7,
      goalProgressDays: 0,
      remindersMarkedDone: 0,
    };
    const out = runReflectionEngine({ period: periodWeek, activities, metrics, priorMetrics: null });
    expect(out.some((x) => x.messageKey === 'insights.week.full_mood_week')).toBe(true);
  });

  it('soft habit co-occurrence requires minimum co-days', () => {
    const activities: Record<string, DayActivity> = {
      '2026-06-01': withMood(withHabit(baseRow('2026-06-01'), 'read_book'), 'A'),
      '2026-06-02': withMood(withHabit(baseRow('2026-06-02'), 'read_book'), 'B'),
      '2026-06-03': withMood(withHabit(baseRow('2026-06-03'), 'read_book'), 'A'),
    };
    const metrics: PeriodMetrics = {
      daysInPeriod: 3,
      daysWithMoodEntry: 3,
      daysWithJournalNote: 0,
      daysWithAnyActivity: 3,
      daysWithHabitOn: 3,
      maxMoodLoggingStreak: 3,
      goalProgressDays: 0,
      remindersMarkedDone: 0,
    };
    const out = runReflectionEngine({
      period: { kind: 'week', start: '2026-06-01', end: '2026-06-03' },
      activities,
      metrics,
      priorMetrics: null,
    });
    expect(out.some((x) => x.messageKey === 'insights.habit.mood_cooccurrence_tentative')).toBe(true);
  });

  it('uses soft habit wording when co-days reach five', () => {
    const activities: Record<string, DayActivity> = {
      '2026-06-01': withMood(withHabit(baseRow('2026-06-01'), 'read_book'), 'A'),
      '2026-06-02': withMood(withHabit(baseRow('2026-06-02'), 'read_book'), 'B'),
      '2026-06-03': withMood(withHabit(baseRow('2026-06-03'), 'read_book'), 'A'),
      '2026-06-04': withMood(withHabit(baseRow('2026-06-04'), 'read_book'), 'A'),
      '2026-06-05': withMood(withHabit(baseRow('2026-06-05'), 'read_book'), 'B'),
    };
    const metrics: PeriodMetrics = {
      daysInPeriod: 5,
      daysWithMoodEntry: 5,
      daysWithJournalNote: 0,
      daysWithAnyActivity: 5,
      daysWithHabitOn: 5,
      maxMoodLoggingStreak: 5,
      goalProgressDays: 0,
      remindersMarkedDone: 0,
    };
    const out = runReflectionEngine({
      period: { kind: 'week', start: '2026-06-01', end: '2026-06-05' },
      activities,
      metrics,
      priorMetrics: null,
    });
    expect(out.some((x) => x.messageKey === 'insights.habit.mood_cooccurrence_soft')).toBe(true);
  });
});
