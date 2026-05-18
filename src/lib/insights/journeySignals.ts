/**
 * @fileoverview Long-horizon **goal journey** hints from merged history (no new SoT).
 * @module lib/insights/journeySignals
 */

import type { Goal } from '../../types/goals.types';
import type { InsightArtifact, InsightPeriod } from '../../types/insights.types';
import { canonicalizeGoalModel, mergeGoalHistoryByDate } from '../goals/goalMath';
import { parseISODate } from '../utils/date';

function daySpanInclusive(first: string, last: string): number {
  const a = parseISODate(first);
  const b = parseISODate(last);
  if (!a || !b) return 0;
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return diff >= 0 ? diff + 1 : 0;
}

/**
 * When an **active** goal has progress logged across a long calendar span, emit one gentle arc observation.
 * Params are numeric only (no goal titles — user-authored strings stay out of insight templates).
 */
export function maybeGoalJourneyArtifact(period: InsightPeriod, goals: readonly Goal[]): InsightArtifact | null {
  let bestSpan = 0;
  for (const g of goals) {
    if (g.status !== 'active') continue;
    const c = canonicalizeGoalModel(g);
    const positive = mergeGoalHistoryByDate(c.history).filter((h) => h.value > 0);
    if (positive.length < 2) continue;
    const first = positive[0]!.date;
    const last = positive[positive.length - 1]!.date;
    const span = daySpanInclusive(first, last);
    if (span > bestSpan) bestSpan = span;
  }
  if (bestSpan < 45) return null;
  return {
    id: `${period.start}:insights.goal.journey_arc_soft:v0`,
    messageKey: 'insights.goal.journey_arc_soft',
    tone: 'warm',
    priority: 18,
    params: { spanDays: bestSpan },
  };
}
