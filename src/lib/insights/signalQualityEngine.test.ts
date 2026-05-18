/**
 * @fileoverview Unit tests for {@link qualifyInsights} and merge helpers.
 * @module lib/insights/signalQualityEngine.test
 */

import type { InsightArtifact, InsightPeriod, PeriodMetrics } from '../../types/insights.types';
import { qualifyInsights, mergeRawInsights } from './signalQualityEngine';

const periodWeek: InsightPeriod = { kind: 'week', start: '2026-06-01', end: '2026-06-07' };

function ctx(metrics: Partial<PeriodMetrics> = {}, prior: PeriodMetrics | null = null): {
  period: InsightPeriod;
  metrics: PeriodMetrics;
  priorMetrics: PeriodMetrics | null;
} {
  const base: PeriodMetrics = {
    daysInPeriod: 7,
    daysWithMoodEntry: 0,
    daysWithJournalNote: 0,
    daysWithAnyActivity: 0,
    daysWithHabitOn: 0,
    maxMoodLoggingStreak: 0,
    goalProgressDays: 0,
    remindersMarkedDone: 0,
    ...metrics,
  };
  return { period: periodWeek, metrics: base, priorMetrics: prior };
}

describe('signalQualityEngine', () => {
  it('dedupes continuity mood: full week wins over parallel streak card', () => {
    const raw: InsightArtifact[] = [
      {
        id: '2026-06-01:insights.week.full_mood_week:v0',
        messageKey: 'insights.week.full_mood_week',
        tone: 'celebrate',
        priority: 15,
        params: { days: 7 },
      },
      {
        id: '2026-06-01:insights.streak.mood_logging:v0',
        messageKey: 'insights.streak.mood_logging',
        tone: 'warm',
        priority: 10,
        params: { days: 7 },
      },
    ];
    const out = qualifyInsights(raw, ctx({ daysWithMoodEntry: 7, daysWithAnyActivity: 7, maxMoodLoggingStreak: 7 }));
    expect(out.some((x) => x.messageKey === 'insights.week.full_mood_week')).toBe(true);
    expect(out.some((x) => x.messageKey === 'insights.streak.mood_logging')).toBe(false);
  });

  it('drops tentative habit co-occurrence when a stronger non-low insight exists', () => {
    const raw: InsightArtifact[] = [
      {
        id: '2026-06-01:insights.habit.mood_cooccurrence_tentative:read_book',
        messageKey: 'insights.habit.mood_cooccurrence_tentative',
        tone: 'calm',
        priority: 30,
        params: { habitLabel: 'Reading', coDays: 3 },
      },
      {
        id: '2026-06-01:insights.streak.journal_notes:v0',
        messageKey: 'insights.streak.journal_notes',
        tone: 'warm',
        priority: 12,
        params: { days: 8 },
      },
    ];
    const out = qualifyInsights(raw, ctx({ daysWithJournalNote: 8 }));
    expect(out.some((x) => x.messageKey === 'insights.habit.mood_cooccurrence_tentative')).toBe(false);
    expect(out.some((x) => x.messageKey === 'insights.streak.journal_notes')).toBe(true);
  });

  it('assigns low confidence to short mood streaks in a week window', () => {
    const raw: InsightArtifact[] = [
      {
        id: '2026-06-01:insights.streak.mood_logging:v0',
        messageKey: 'insights.streak.mood_logging',
        tone: 'warm',
        priority: 10,
        params: { days: 3 },
      },
      {
        id: '2026-06-01:insights.streak.journal_notes:v0',
        messageKey: 'insights.streak.journal_notes',
        tone: 'warm',
        priority: 12,
        params: { days: 8 },
      },
    ];
    const out = qualifyInsights(raw, ctx({ maxMoodLoggingStreak: 3, daysWithJournalNote: 8 }));
    const mood = out.find((x) => x.messageKey === 'insights.streak.mood_logging');
    expect(mood?.confidence).toBe('low');
  });

  it('mergeRawInsights is deterministic and avoids duplicate ids', () => {
    const a: InsightArtifact = {
      id: 'x:insights.prompt.reflective_rotation:prompt',
      messageKey: 'insights.prompt.reflective_rotation',
      tone: 'calm',
      priority: 40,
      params: { snippet: 'q' },
    };
    const merged = mergeRawInsights([a], [a]);
    expect(merged).toHaveLength(1);
  });

  it('caps body insights but keeps a single closing prompt when present', () => {
    const raw: InsightArtifact[] = [
      {
        id: '2026-06-01:insights.streak.mood_logging:v0',
        messageKey: 'insights.streak.mood_logging',
        tone: 'warm',
        priority: 10,
        params: { days: 7 },
      },
      {
        id: '2026-06-01:insights.streak.journal_notes:v0',
        messageKey: 'insights.streak.journal_notes',
        tone: 'warm',
        priority: 12,
        params: { days: 8 },
      },
      {
        id: '2026-06-01:insights.week.active_more_than_prior:v0',
        messageKey: 'insights.week.active_more_than_prior',
        tone: 'warm',
        priority: 20,
        params: { current: 6, prior: 2 },
      },
      {
        id: '2026-06-01:insights.week.goal_logs_more_than_prior:v0',
        messageKey: 'insights.week.goal_logs_more_than_prior',
        tone: 'warm',
        priority: 22,
        params: { current: 5, prior: 1 },
      },
      {
        id: '2026-06-01:insights.goal.journey_arc_soft:v0',
        messageKey: 'insights.goal.journey_arc_soft',
        tone: 'warm',
        priority: 18,
        params: { spanDays: 90 },
      },
      {
        id: '2026-06-01:insights.prompt.reflective_rotation:prompt',
        messageKey: 'insights.prompt.reflective_rotation',
        tone: 'calm',
        priority: 40,
        params: { snippet: 'x' },
      },
    ];
    const out = qualifyInsights(raw, ctx({ daysWithJournalNote: 8, maxMoodLoggingStreak: 7, goalProgressDays: 5 }));
    const prompts = out.filter((x) => x.messageKey === 'insights.prompt.reflective_rotation');
    expect(prompts).toHaveLength(1);
    expect(out[out.length - 1]?.messageKey).toBe('insights.prompt.reflective_rotation');
    expect(out.filter((x) => x.messageKey !== 'insights.prompt.reflective_rotation').length).toBeLessThanOrEqual(4);
  });
});
