/**
 * @fileoverview Default English templates for **NarrativeArtifact.messageKey** (i18n anchor).
 * @module lib/narrative/narrativeCatalog
 */

import type { NarrativeMessageKey } from '../../types/narrative.types';

const TABLE: Record<NarrativeMessageKey, string> = {
  'narrative.chapter.steady_rhythm':
    'Across part of this span, your log shows a steady rhythm — not perfect, just present.',
  'narrative.chapter.more_present':
    'There was a stretch here where your days showed up more often in the log — a little more structure in the everyday noise.',
  'narrative.chapter.quieter_span':
    'A quieter stretch appears in this window — fewer marks on the calendar, which can be its own kind of season.',
  'narrative.chapter.reflective_stretch':
    'Notes showed up more often for a while — a reflective stretch, even in small lines.',
  'narrative.transition.toward_consistency':
    'Around {transitionDay}, the pattern in your log shifts toward showing up a bit more often — gently, not as a verdict.',
  'narrative.transition.soft_pause':
    'Around {transitionDay}, activity in the log softens compared with the stretch before — a pause, not a failure.',
  'narrative.continuity.journal_rebuilding':
    'The back half of this window carries more journal notes than the first — a slow rebuild of consistency, if you want to call it that.',
  'narrative.seasonal.weekend_vs_weekday':
    'Weekends in this window carried a bit more presence in the log than weekdays — a small rhythm worth noticing, not a rule.',
  'narrative.milestone.journal_streak_window':
    'Within this span, notes landed on {streakDays} days in a row at most — a quiet streak worth remembering.',
  'narrative.summary.gentle_span_overview':
    'Across {spanDays} days, {activeDays} carried some activity in your log — enough shape to notice, not enough to summarize a life.',
};

export function formatNarrativeTemplate(
  key: NarrativeMessageKey,
  params: Readonly<Record<string, string | number>>
): string {
  let s = TABLE[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}
