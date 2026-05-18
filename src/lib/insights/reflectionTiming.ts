/**
 * @fileoverview **Presentation timing** — cooldowns per semantic topic (local, inspectable).
 * @module lib/insights/reflectionTiming
 *
 * Read paths use {@link filterInsightsByCooldowns}. Writes happen only via
 * `insightsReflectionStateStorage` when the UI (or host) records a surface event.
 */

import type { QualifiedInsight } from '../../types/insights.types';

export type InsightsTimingStateV1 = {
  schemaVersion: 1;
  /** topicId → last time user saw an insight in this topic (epoch ms). */
  topicLastSurfacedAtMs: Record<string, number>;
};

export const EMPTY_TIMING_STATE: InsightsTimingStateV1 = Object.freeze({
  schemaVersion: 1,
  topicLastSurfacedAtMs: {},
});

/** Cooldowns are conservative: calm product, not engagement loops. */
export const TOPIC_COOLDOWN_MS: Readonly<Record<string, number>> = Object.freeze({
  'reflection.prompt': 36 * 60 * 60 * 1000,
  'streak.mood': 72 * 60 * 60 * 1000,
  'streak.journal': 72 * 60 * 60 * 1000,
  'week.full_mood': 5 * 24 * 60 * 60 * 1000,
  'week.compare.activity': 48 * 60 * 60 * 1000,
  'week.compare.goals': 48 * 60 * 60 * 1000,
  'month.summary': 7 * 24 * 60 * 60 * 1000,
  'goal.journey_arc': 14 * 24 * 60 * 60 * 1000,
  'empty.week': 0,
});

const HABIT_CO_PREFIX = 'habit.mood_co:';

function cooldownMsForTopic(topicId: string): number {
  if (topicId.startsWith(HABIT_CO_PREFIX)) return 5 * 24 * 60 * 60 * 1000;
  return TOPIC_COOLDOWN_MS[topicId] ?? 48 * 60 * 60 * 1000;
}

function isAlwaysAllowedDuringCooldown(q: QualifiedInsight): boolean {
  return q.messageKey === 'insights.empty.week_gentle';
}

/**
 * Drops insights whose topic was surfaced recently (read-only).
 */
export function filterInsightsByCooldowns(
  insights: readonly QualifiedInsight[],
  state: InsightsTimingStateV1,
  nowMs: number
): QualifiedInsight[] {
  const out: QualifiedInsight[] = [];
  for (const q of insights) {
    if (isAlwaysAllowedDuringCooldown(q)) {
      out.push(q);
      continue;
    }
    const last = state.topicLastSurfacedAtMs[q.topicId];
    const cd = cooldownMsForTopic(q.topicId);
    if (last !== undefined && nowMs - last < cd) continue;
    out.push(q);
  }
  return out;
}

/**
 * Merge surfaced topics into timing state (deterministic key order not required).
 */
export function timingStateAfterRecording(
  prev: InsightsTimingStateV1,
  topicIds: readonly string[],
  nowMs: number
): InsightsTimingStateV1 {
  const nextMap = { ...prev.topicLastSurfacedAtMs };
  for (const t of topicIds) {
    nextMap[t] = nowMs;
  }
  return { schemaVersion: 1, topicLastSurfacedAtMs: nextMap };
}
