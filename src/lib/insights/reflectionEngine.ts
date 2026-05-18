/**
 * @fileoverview Deterministic **Reflection Engine** — turns local period metrics into gentle insights.
 * @module lib/insights/reflectionEngine
 *
 * - No network, no models, no user note text.
 * - Same inputs ⇒ same outputs (stable sort + stable ids).
 */

import type { DayActivity } from '../../types/dailyActivity.types';
import type { InsightArtifact, InsightMessageKey, InsightPeriod, InsightTone } from '../../types/insights.types';
import type { PeriodMetrics } from '../../types/insights.types';
import { HABIT_CATALOG } from '../constants/habitsCatalog';
import { pickReflectiveSnippet } from './insightCatalog';
import { isMoodAtLeastB } from './moodOrdinal';

export type ReflectionEngineInput = {
  period: InsightPeriod;
  /** Current window `DayActivity` rows keyed by local day. */
  activities: Readonly<Record<string, DayActivity>>;
  metrics: PeriodMetrics;
  priorMetrics: PeriodMetrics | null;
};

function idFor(start: string, key: InsightMessageKey, suffix: string): string {
  return `${start}:${key}:${suffix}`;
}

function push(
  out: InsightArtifact[],
  start: string,
  key: InsightMessageKey,
  tone: InsightTone,
  priority: number,
  suffix: string,
  params: Readonly<Record<string, string | number>>
): void {
  out.push({
    id: idFor(start, key, suffix),
    messageKey: key,
    tone,
    priority,
    params,
  });
}

function pickCooccurrenceHabit(activities: Readonly<Record<string, DayActivity>>): { habitId: string; habitLabel: string; coDays: number } | null {
  const days = Object.keys(activities).sort();
  for (const def of HABIT_CATALOG) {
    let co = 0;
    for (const d of days) {
      const row = activities[d];
      if (!row) continue;
      if (!row.habits.selectedIds.includes(def.id)) continue;
      if (isMoodAtLeastB(row.mood.grade)) co += 1;
    }
    if (co >= 3) return { habitId: def.id, habitLabel: def.label, coDays: co };
  }
  return null;
}

function sortInsights(list: InsightArtifact[]): InsightArtifact[] {
  return list.slice().sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : a.id.localeCompare(b.id)));
}

export function runReflectionEngine(input: ReflectionEngineInput): readonly InsightArtifact[] {
  const { period, activities, metrics, priorMetrics } = input;
  const start = period.start;
  const out: InsightArtifact[] = [];

  const totallyEmpty =
    metrics.daysWithMoodEntry === 0 &&
    metrics.daysWithJournalNote === 0 &&
    metrics.daysWithAnyActivity === 0 &&
    metrics.daysWithHabitOn === 0 &&
    metrics.goalProgressDays === 0 &&
    metrics.remindersMarkedDone === 0;

  if (totallyEmpty && period.kind === 'week') {
    push(out, start, 'insights.empty.week_gentle', 'calm', 0, 'v0', {});
    push(out, start, 'insights.prompt.reflective_rotation', 'calm', 5, 'v1', {
      snippet: pickReflectiveSnippet(start),
    });
    return sortInsights(out);
  }

  if (totallyEmpty && period.kind === 'month') {
    push(out, start, 'insights.month.summary_sparse', 'calm', 1, 'v0', {
      activeDays: 0,
      days: metrics.daysInPeriod,
    });
    push(out, start, 'insights.prompt.reflective_rotation', 'calm', 5, 'v1', {
      snippet: pickReflectiveSnippet(start),
    });
    return sortInsights(out);
  }

  if (period.kind === 'month') {
    if (metrics.daysWithAnyActivity >= 10) {
      push(out, start, 'insights.month.summary_rich', 'warm', 2, 'v0', {
        activeDays: metrics.daysWithAnyActivity,
        days: metrics.daysInPeriod,
      });
    } else {
      push(out, start, 'insights.month.summary_sparse', 'calm', 3, 'v0', {
        activeDays: metrics.daysWithAnyActivity,
        days: metrics.daysInPeriod,
      });
    }
  }

  if (metrics.maxMoodLoggingStreak >= 3) {
    push(out, start, 'insights.streak.mood_logging', 'warm', 10, 'v0', { days: metrics.maxMoodLoggingStreak });
  }

  if (metrics.daysWithJournalNote >= 5) {
    push(out, start, 'insights.streak.journal_notes', 'warm', 12, 'v0', { days: metrics.daysWithJournalNote });
  }

  if (period.kind === 'week' && metrics.daysInPeriod >= 7 && metrics.daysWithMoodEntry === metrics.daysInPeriod) {
    push(out, start, 'insights.week.full_mood_week', 'celebrate', 15, 'v0', { days: metrics.daysInPeriod });
  }

  const priorHasSignal =
    priorMetrics &&
    (priorMetrics.daysWithAnyActivity > 0 ||
      priorMetrics.daysWithMoodEntry > 0 ||
      priorMetrics.daysWithJournalNote > 0);

  if (priorHasSignal && period.kind === 'week') {
    const p = priorMetrics!;
    if (metrics.daysWithAnyActivity > p.daysWithAnyActivity) {
      push(out, start, 'insights.week.active_more_than_prior', 'warm', 20, 'v0', {
        current: metrics.daysWithAnyActivity,
        prior: p.daysWithAnyActivity,
      });
    }
    if (metrics.goalProgressDays > p.goalProgressDays) {
      push(out, start, 'insights.week.goal_logs_more_than_prior', 'warm', 22, 'v0', {
        current: metrics.goalProgressDays,
        prior: p.goalProgressDays,
      });
    }
  }

  const co = pickCooccurrenceHabit(activities);
  if (co) {
    const key: InsightMessageKey =
      co.coDays >= 5 ? 'insights.habit.mood_cooccurrence_soft' : 'insights.habit.mood_cooccurrence_tentative';
    push(out, start, key, 'calm', 30, co.habitId, {
      habitLabel: co.habitLabel,
      coDays: co.coDays,
    });
  }

  push(out, start, 'insights.prompt.reflective_rotation', 'calm', 40, 'prompt', {
    snippet: pickReflectiveSnippet(start),
  });

  return sortInsights(out);
}
