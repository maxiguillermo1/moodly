/**
 * @fileoverview Local-first **insights** façade — read-only composition over existing stores.
 * @module data/repositories/insightsRepository
 *
 * - Source of truth: `moodly.*` via `getDayActivityRange` + `goalsRepository.getGoals()` (no duplicate entry reads).
 * - Deterministic engine: `src/lib/insights/reflectionEngine.ts`.
 * - Signal quality + optional presentation timing: `signalQualityEngine`, `reflectionTiming`, `insightsReflectionStateStorage`.
 */

import { filterInsightsByCooldowns } from '../../lib/insights/reflectionTiming';
import { addLocalDays, endOfMonthContaining, startOfMonthContaining } from '../../lib/insights/periodBounds';
import { runReflectionEngine } from '../../lib/insights/reflectionEngine';
import { maybeGoalJourneyArtifact } from '../../lib/insights/journeySignals';
import { mergeRawInsights, qualifyInsights } from '../../lib/insights/signalQualityEngine';
import { isValidLocalCalendarDayKey } from '../../lib/utils/date';
import { buildPeriodMetrics } from '../../lib/insights/summaryGenerators';
import type { InsightBundle, InsightPeriod, PeriodMetrics, QualifiedInsight } from '../../types/insights.types';
import { ensureLocalPersistenceReady } from '../persistence/bootstrap';
import { insightsReflectionStateStorage } from '../storage/insightsReflectionStateStorage';
import { getDayActivityRange } from './dailyActivityRepository';
import { goalsRepository } from './goalsRepository';

function zeroMetrics(): PeriodMetrics {
  return {
    daysInPeriod: 0,
    daysWithMoodEntry: 0,
    daysWithJournalNote: 0,
    daysWithAnyActivity: 0,
    daysWithHabitOn: 0,
    maxMoodLoggingStreak: 0,
    goalProgressDays: 0,
    remindersMarkedDone: 0,
  };
}

export type WeeklyInsightOptions = {
  /** When false, skip cooldown filter (export / tests). Default true. */
  applyTimingPolicy?: boolean;
  /** Injected clock for deterministic tests. */
  nowMs?: number;
};

export const insightsRepository = {
  /**
   * Weekly reflection for the 7-day window starting `weekStart` (local `YYYY-MM-DD`, inclusive).
   * Prior week is loaded when possible for gentle comparisons.
   */
  async getWeeklyInsightBundle(weekStart: string, options?: WeeklyInsightOptions): Promise<InsightBundle> {
    await ensureLocalPersistenceReady();
    if (!isValidLocalCalendarDayKey(weekStart)) {
      const period: InsightPeriod = { kind: 'week', start: weekStart, end: weekStart };
      return {
        period,
        composedAt: Date.now(),
        metrics: zeroMetrics(),
        priorMetrics: null,
        insights: [],
      };
    }
    const weekEnd = addLocalDays(weekStart, 6);
    const prevStart = addLocalDays(weekStart, -7);
    const prevEnd = addLocalDays(weekStart, -1);
    const period: InsightPeriod = { kind: 'week', start: weekStart, end: weekEnd };
    const [cur, prev] = await Promise.all([
      getDayActivityRange(weekStart, weekEnd),
      getDayActivityRange(prevStart, prevEnd),
    ]);
    const goals = await goalsRepository.getGoals();
    const metrics = buildPeriodMetrics(cur, goals, weekStart, weekEnd);
    const priorMetrics =
      Object.keys(prev).length > 0 ? buildPeriodMetrics(prev, goals, prevStart, prevEnd) : null;
    const rawEngine = runReflectionEngine({ period, activities: cur, metrics, priorMetrics });
    const journey = maybeGoalJourneyArtifact(period, goals);
    const merged = mergeRawInsights(rawEngine, journey ? [journey] : []);
    const qualified = qualifyInsights(merged, { period, metrics, priorMetrics });
    const insights = await applyTimingIfNeeded(qualified, options);
    return { period, composedAt: Date.now(), metrics, priorMetrics, insights };
  },

  /**
   * Monthly reflection for the calendar month containing `anyDayInMonth` (local `YYYY-MM-DD`).
   */
  async getMonthlyInsightBundle(anyDayInMonth: string, options?: WeeklyInsightOptions): Promise<InsightBundle> {
    await ensureLocalPersistenceReady();
    if (!isValidLocalCalendarDayKey(anyDayInMonth)) {
      const period: InsightPeriod = { kind: 'month', start: anyDayInMonth, end: anyDayInMonth };
      return {
        period,
        composedAt: Date.now(),
        metrics: zeroMetrics(),
        priorMetrics: null,
        insights: [],
      };
    }
    const start = startOfMonthContaining(anyDayInMonth);
    const end = endOfMonthContaining(anyDayInMonth);
    const period: InsightPeriod = { kind: 'month', start, end };
    const cur = await getDayActivityRange(start, end);
    const goals = await goalsRepository.getGoals();
    const metrics = buildPeriodMetrics(cur, goals, start, end);
    const rawEngine = runReflectionEngine({ period, activities: cur, metrics, priorMetrics: null });
    const journey = maybeGoalJourneyArtifact(period, goals);
    const merged = mergeRawInsights(rawEngine, journey ? [journey] : []);
    const qualified = qualifyInsights(merged, { period, metrics, priorMetrics: null });
    const insights = await applyTimingIfNeeded(qualified, options);
    return { period, composedAt: Date.now(), metrics, priorMetrics: null, insights };
  },

  /**
   * Call when the user actually **saw** these topics (e.g. after rendering an insights strip).
   * Drives cooldowns for future reads — does not change canonical mood/goal data.
   */
  async recordSurfacedInsightTopics(topicIds: readonly string[], nowMs?: number): Promise<void> {
    await insightsReflectionStateStorage.recordTopicsSurfaced(topicIds, nowMs);
  },
} as const;

async function applyTimingIfNeeded(
  qualified: readonly QualifiedInsight[],
  options?: WeeklyInsightOptions
): Promise<readonly QualifiedInsight[]> {
  const apply = options?.applyTimingPolicy !== false;
  if (!apply) return qualified;
  const nowMs = typeof options?.nowMs === 'number' && Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
  const state = await insightsReflectionStateStorage.getTimingState();
  return filterInsightsByCooldowns(qualified, state, nowMs);
}

export type IInsightsRepository = typeof insightsRepository;
