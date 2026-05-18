/**
 * @fileoverview Mood grade ordering for soft correlations (local-first, deterministic).
 * @module lib/insights/moodOrdinal
 */

import type { MoodGrade } from '../../types/mood.types';

const ORDER: readonly MoodGrade[] = ['A+', 'A', 'B', 'C', 'D', 'F'];

const rankByGrade: Record<MoodGrade, number> = ORDER.reduce(
  (acc, g, i) => {
    acc[g] = i;
    return acc;
  },
  {} as Record<MoodGrade, number>
);

export function moodGradeRank(grade: MoodGrade | null | undefined): number | null {
  if (!grade) return null;
  const r = rankByGrade[grade];
  return typeof r === 'number' ? r : null;
}

/** `true` when both ranks exist and `a` is strictly better (smaller rank index). */
export function isStrictlyBetterMood(a: MoodGrade | null | undefined, b: MoodGrade | null | undefined): boolean {
  const ra = moodGradeRank(a);
  const rb = moodGradeRank(b);
  if (ra == null || rb == null) return false;
  return ra < rb;
}

/** Mood at least “B” (inclusive) — gentle high band for co-occurrence copy. */
export function isMoodAtLeastB(grade: MoodGrade | null | undefined): boolean {
  const r = moodGradeRank(grade);
  if (r == null) return false;
  return r <= rankByGrade.B;
}
