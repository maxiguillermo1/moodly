/**
 * @fileoverview Default English templates for **InsightArtifact.messageKey** (i18n anchor).
 * @module lib/insights/insightCatalog
 *
 * UI layers should translate `messageKey` + `params`. This module is the single non-i18n
 * string table for snapshots/tests and dev tools.
 */

import type { InsightMessageKey } from '../../types/insights.types';

const TABLE: Record<InsightMessageKey, string> = {
  'insights.empty.week_gentle':
    'A quiet week in your log. Whenever you are ready, one line about your day is enough.',
  'insights.streak.mood_logging':
    'You logged your mood {days} days in a row — a gentle streak worth noticing.',
  'insights.streak.journal_notes':
    'You added journal notes on {days} days this period — steady reflection.',
  'insights.week.active_more_than_prior':
    'This week had more active days than the week before. Small rhythms add up.',
  'insights.week.goal_logs_more_than_prior':
    'You touched your goals on more days this week than last week. Momentum, quietly.',
  'insights.week.full_mood_week':
    'You checked in with your mood every day this week. That kind of continuity is rare.',
  'insights.habit.mood_cooccurrence_soft':
    'On several days when “{habitLabel}” was on, your mood tended to land in a brighter band. Correlation is not causation — just a pattern worth noticing, not a verdict.',
  'insights.habit.mood_cooccurrence_tentative':
    'On a few days when “{habitLabel}” was on, your mood looked a little brighter. With only {coDays} days in view, treat this as a gentle hint — not a firm rule.',
  'insights.goal.journey_arc_soft':
    'One of your goals has been showing up in your log across about {spanDays} days — a quiet long arc, even when progress is uneven.',
  'insights.prompt.reflective_rotation': '{snippet}',
  'insights.month.summary_sparse':
    'This month includes {activeDays} active days out of {days} — gentle ebbs are normal.',
  'insights.month.summary_rich':
    'This month shows steady presence in your log — mood, notes, or small habits showing up across the days.',
};

/** Deterministic copy for tests, exports, and optional dev UI. */
export function formatInsightTemplate(key: InsightMessageKey, params: Readonly<Record<string, string | number>>): string {
  let s = TABLE[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

export const REFLECTIVE_SNIPPETS: readonly string[] = [
  'What is one small thing that steadied you recently?',
  'Which day felt most “like you” this period?',
  'Is there a habit you want to thank yourself for trying?',
  'What would you like next week to remember about this week?',
  'Where did you feel even a little more ease than before?',
  'What felt unfinished — and is that okay for now?',
  'When did you notice your breathing soften, even briefly?',
  'What would you name this chapter of your log, if you had to?',
];

export function pickReflectiveSnippet(periodStart: string): string {
  let acc = 0;
  for (let i = 0; i < periodStart.length; i++) acc = (acc + periodStart.charCodeAt(i) * (i + 1)) % 997;
  const idx = Math.abs(acc) % REFLECTIVE_SNIPPETS.length;
  return REFLECTIVE_SNIPPETS[idx]!;
}
