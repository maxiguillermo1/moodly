/**
 * @fileoverview **Transition detection** — momentum shifts between adjacent chapters.
 * @module lib/narrative/transitionDetection
 */

import type { PhaseKind, TimelineChapter } from '../../types/narrative.types';

export type PhaseTransition = {
  /** Start day of the “to” chapter. */
  at: string;
  from: PhaseKind;
  to: PhaseKind;
};

export function detectChapterTransitions(chapters: readonly TimelineChapter[]): PhaseTransition[] {
  const out: PhaseTransition[] = [];
  for (let i = 1; i < chapters.length; i++) {
    const prev = chapters[i - 1]!;
    const cur = chapters[i]!;
    if (prev.phaseKind !== cur.phaseKind) {
      out.push({ at: cur.start, from: prev.phaseKind, to: cur.phaseKind });
    }
  }
  return out;
}
