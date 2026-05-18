/**
 * @fileoverview Local-first **Insights & Reflection** contracts.
 * @module types/insights
 *
 * UI should render from **`QualifiedInsight`** using `messageKey` + `params` (i18n-ready).
 * Bundles are computed on demand; **presentation timing** (topic cooldowns) uses a small
 * persisted map in `insightsReflectionStateStorage` — not a second analytics SoT.
 * Do not confuse with `GoalInsight` in goals types (legacy goal row metadata).
 */

import type { LocalDateKey } from './dailyActivity.types';

/** Period the engine evaluated (local `YYYY-MM-DD` inclusive). */
export type InsightPeriodKind = 'week' | 'month';

export type InsightPeriod = {
  kind: InsightPeriodKind;
  start: LocalDateKey;
  end: LocalDateKey;
};

/**
 * Stable catalog keys for copy + analytics. Templates live in `src/lib/insights/insightCatalog.ts`.
 * Keep values lowercase dotted for grep-ability.
 */
export type InsightMessageKey =
  | 'insights.empty.week_gentle'
  | 'insights.streak.mood_logging'
  | 'insights.streak.journal_notes'
  | 'insights.week.active_more_than_prior'
  | 'insights.week.goal_logs_more_than_prior'
  | 'insights.week.full_mood_week'
  | 'insights.habit.mood_cooccurrence_soft'
  | 'insights.habit.mood_cooccurrence_tentative'
  | 'insights.goal.journey_arc_soft'
  | 'insights.prompt.reflective_rotation'
  | 'insights.month.summary_sparse'
  | 'insights.month.summary_rich';

export type InsightTone = 'calm' | 'warm' | 'celebrate';

/**
 * Transparent confidence for ranking / surfacing policy (not a hidden “engagement score”).
 */
export type InsightConfidence = 'low' | 'medium' | 'high';

/**
 * One deterministic observation. **No user journal text** — only structural params
 * (counts, habit ids, month keys) for formatting.
 */
export type InsightArtifact = {
  /** Deterministic id for dedupe / tests: `${period.start}:${messageKey}:${variant}` */
  id: string;
  messageKey: InsightMessageKey;
  tone: InsightTone;
  /** Lower sorts earlier when presenting a short list. */
  priority: number;
  params: Readonly<Record<string, string | number>>;
};

/**
 * Engine output after **signal quality** pass: confidence, semantic topic, and a
 * deterministic `signalScore` for ordering (inspectable; same inputs ⇒ same score).
 */
export type QualifiedInsight = InsightArtifact & {
  confidence: InsightConfidence;
  /** Dedup + cooldown key (e.g. `habit.mood_co:read_book`, `reflection.prompt`). */
  topicId: string;
  /** Higher = more worth surfacing when capacity is limited (0–100). */
  signalScore: number;
};

/** Transparent aggregates for the period (inspectable; not a “hidden score”). */
export type PeriodMetrics = {
  daysInPeriod: number;
  daysWithMoodEntry: number;
  daysWithJournalNote: number;
  daysWithAnyActivity: number;
  daysWithHabitOn: number;
  maxMoodLoggingStreak: number;
  goalProgressDays: number;
  /** Sum of reminder rows marked done in range (day-sharded; best-effort). */
  remindersMarkedDone: number;
};

export type InsightBundle = {
  period: InsightPeriod;
  composedAt: number;
  metrics: PeriodMetrics;
  priorMetrics: PeriodMetrics | null;
  /** Ranked, deduped, capped — ready for calm UI surfaces. */
  insights: readonly QualifiedInsight[];
};
