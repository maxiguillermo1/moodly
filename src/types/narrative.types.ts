/**
 * @fileoverview **Narrative & life timeline** contracts — structural, local-first, i18n-ready.
 * @module types/narrative
 *
 * No journal text, no user goal titles in params. UI renders from `messageKey` + numeric/enum params.
 */

import type { LocalDateKey } from './dailyActivity.types';

export type NarrativeConfidence = 'low' | 'medium' | 'high';

/** Fortnight / phase labels derived only from counts and mood ranks. */
export type PhaseKind = 'sparse' | 'quiet' | 'steady' | 'high_activity' | 'reflective';

export type NarrativeMessageKey =
  | 'narrative.chapter.steady_rhythm'
  | 'narrative.chapter.more_present'
  | 'narrative.chapter.quieter_span'
  | 'narrative.chapter.reflective_stretch'
  | 'narrative.transition.toward_consistency'
  | 'narrative.transition.soft_pause'
  | 'narrative.continuity.journal_rebuilding'
  | 'narrative.seasonal.weekend_vs_weekday'
  | 'narrative.milestone.journal_streak_window'
  | 'narrative.summary.gentle_span_overview';

export type NarrativePhaseTag = 'chapter' | 'transition' | 'continuity' | 'seasonal' | 'milestone' | 'summary';

/**
 * One gentle narrative line (deterministic id). Not a chat transcript — catalog + params only.
 */
export type NarrativeArtifact = {
  id: string;
  messageKey: NarrativeMessageKey;
  confidence: NarrativeConfidence;
  phaseTag: NarrativePhaseTag;
  params: Readonly<Record<string, string | number>>;
};

/**
 * A merged **life chapter** over local calendar days (structural; hosts map to UI later).
 */
export type TimelineChapter = {
  id: string;
  start: LocalDateKey;
  end: LocalDateKey;
  phaseKind: PhaseKind;
  /** Active days / span length (inspectable density). */
  activityDensity: number;
  spanDays: number;
  activeDays: number;
  journalDays: number;
  moodDays: number;
};

export type NarrativeWindow = {
  start: LocalDateKey;
  end: LocalDateKey;
};

export type NarrativeBundle = {
  window: NarrativeWindow;
  composedAt: number;
  /** Long-horizon structural segments (continuity for future UI). */
  chapters: readonly TimelineChapter[];
  /** Ranked narrative lines (capped in engine). */
  artifacts: readonly NarrativeArtifact[];
  /** Deterministic fingerprint of inputs for future incremental cache (no PII). */
  digest: string;
};
