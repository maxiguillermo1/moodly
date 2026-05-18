/**
 * @fileoverview Deterministic **digest** for narrative windows (future incremental cache / export).
 * @module lib/narrative/narrativeDigest
 */

import type { NarrativeWindow } from '../../types/narrative.types';
import type { TimelineChapter } from '../../types/narrative.types';

export function computeNarrativeDigest(
  window: NarrativeWindow,
  chapters: readonly Pick<TimelineChapter, 'phaseKind' | 'spanDays' | 'activeDays'>[],
  totals: { activeDays: number; journalDays: number; moodDays: number }
): string {
  const sig = [
    window.start,
    window.end,
    chapters.map((c) => `${c.phaseKind}:${c.spanDays}:${c.activeDays}`).join('|'),
    totals.activeDays,
    totals.journalDays,
    totals.moodDays,
  ].join('~');
  let h = 2166136261;
  for (let i = 0; i < sig.length; i++) {
    h ^= sig.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `nar1.${(h >>> 0).toString(16)}`;
}
