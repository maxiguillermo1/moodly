/**
 * @fileoverview Pure goal progress, streak, and preview helpers.
 * @module lib/goals/goalMath
 *
 * **History is the source of truth.** `progress.currentValue` is always derivable from
 * `history` + `type` (see {@link canonicalizeGoalModel}). Same calendar day keeps a single
 * row: the latest `createdAt` wins when merging duplicates.
 */

import type { Goal, GoalComputedProgress, GoalHistory, GoalInsight, GoalType } from '../../types';
import { formatDateToISO, getToday } from '../utils/date';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function safeTarget(target: number): number {
  return Number.isFinite(target) && target > 0 ? target : 1;
}

/**
 * Merge history to **one row per local calendar day** (`YYYY-MM-DD`).
 * When multiple rows share a date, the row with the greatest `createdAt` wins (replace semantics).
 */
export function mergeGoalHistoryByDate(history: readonly GoalHistory[] | undefined | null): GoalHistory[] {
  if (!history || history.length === 0) return [];
  const byDate = new Map<string, GoalHistory>();
  for (const item of history) {
    if (!item?.date) continue;
    const prev = byDate.get(item.date);
    if (!prev || item.createdAt > prev.createdAt) byDate.set(item.date, item);
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt));
}

/** Distinct local days with at least one positive log value. */
export function goalLoggedDayCount(history: readonly GoalHistory[]): number {
  const merged = mergeGoalHistoryByDate(history);
  let n = 0;
  for (const item of merged) {
    if (item.value > 0) n += 1;
  }
  return n;
}

function sumHistoryValues(history: readonly GoalHistory[]): number {
  let s = 0;
  for (const item of history) {
    const v = item.value;
    if (Number.isFinite(v) && v > 0) s += v;
  }
  return s;
}

/**
 * Derive `progress.currentValue` from merged history and goal type.
 * - **habit / target / project**: sum of positive daily values (one value per day after merge).
 * - **average**: arithmetic mean of merged daily values (days with 0 still count in the mean).
 */
export function deriveCurrentValueFromHistory(type: GoalType, mergedHistory: readonly GoalHistory[]): number {
  if (mergedHistory.length === 0) return 0;
  if (type === 'average') {
    const sum = mergedHistory.reduce((acc, h) => acc + (Number.isFinite(h.value) ? h.value : 0), 0);
    return sum / mergedHistory.length;
  }
  return sumHistoryValues(mergedHistory);
}

/**
 * Canonical in-memory view: merged history + derived `currentValue` + safe target.
 * All percent / streak / “logged days” calculations should run on this shape.
 */
export function canonicalizeGoalModel(goal: Goal): Goal {
  const history = mergeGoalHistoryByDate(goal.history);
  const currentValue = deriveCurrentValueFromHistory(goal.type, history);
  return {
    ...goal,
    history,
    progress: {
      ...goal.progress,
      currentValue,
      targetValue: safeTarget(goal.progress.targetValue),
    },
  };
}

function historyOnDate(history: readonly GoalHistory[], date: string): GoalHistory[] {
  return history.filter((item) => item.date === date);
}

function completedDateSet(history: readonly GoalHistory[]): Set<string> {
  const completed = new Set<string>();
  for (const item of history) {
    if (item.value > 0) completed.add(item.date);
  }
  return completed;
}

/** Percent complete in [0, 100], derived only from canonical history + goal config. */
export function goalProgressPercent(goal: Goal): number {
  const c = canonicalizeGoalModel(goal);
  if (c.durationDays !== undefined) {
    if (c.durationDays === null || c.durationDays <= 0) return 0;
    const logged = goalLoggedDayCount(c.history);
    return clamp01(logged / c.durationDays) * 100;
  }
  const target = c.progress.targetValue;
  if (!Number.isFinite(target) || target <= 0) return 0;
  if (c.type === 'average') return clamp01(c.progress.currentValue / target) * 100;
  return clamp01(c.progress.currentValue / target) * 100;
}

export function goalCompletedOnDate(goal: Goal, date: string = getToday()): boolean {
  const c = canonicalizeGoalModel(goal);
  return historyOnDate(c.history, date).some((item) => item.value > 0);
}

export function goalStreak(goal: Goal, today: string = getToday()): number {
  const c = canonicalizeGoalModel(goal);
  const completed = completedDateSet(c.history);
  return goalStreakFromCompleted(completed, today);
}

function goalStreakFromCompleted(completed: ReadonlySet<string>, today: string): number {
  const [y, m, d] = today.split('-').map(Number);
  const cursor = new Date(y || 1970, (m || 1) - 1, d || 1);
  let streak = 0;
  while (completed.has(formatDateToISO(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function insightMessage(goal: Goal, streak: number, percent: number): string {
  let message = 'Start with one small step.';
  if (goal.status === 'completed') message = 'You completed this goal gently and steadily.';
  else if (streak >= 2) message = `You've completed this ${streak} days in a row.`;
  else if (percent > 0) message = `You're ${percent}% of the way there.`;
  else if (goal.type === 'project') message = 'One clear milestone is enough to begin.';
  return message;
}

export function buildGoalInsight(goal: Goal, today: string = getToday()): GoalInsight {
  const c = canonicalizeGoalModel(goal);
  const streak = goalStreakFromCompleted(completedDateSet(c.history), today);
  const percent = Math.round(goalProgressPercent(goal));
  const message = insightMessage(goal, streak, percent);
  return {
    id: `${goal.id}:insight:${today}`,
    tone: 'encouraging',
    message,
    createdAt: Date.now(),
  };
}

export function computeGoalProgress(goal: Goal, today: string = getToday()): GoalComputedProgress {
  const c = canonicalizeGoalModel(goal);
  const completed = completedDateSet(c.history);
  const loggedDays = completed.size;
  const percent = goalProgressPercent(goal);
  const streak = goalStreakFromCompleted(completed, today);
  const rounded = Math.round(percent);
  return {
    percent,
    streak,
    completedToday: completed.has(today),
    loggedDays,
    insight: {
      id: `${goal.id}:insight:${today}`,
      tone: 'encouraging',
      message: insightMessage(goal, streak, rounded),
      createdAt: Date.now(),
    },
  };
}

export function sortGoalsForDisplay(goals: readonly Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    const statusRank = (g: Goal) => (g.status === 'active' ? 0 : g.status === 'completed' ? 1 : 2);
    return statusRank(a) - statusRank(b) || b.updatedAt - a.updatedAt || a.title.localeCompare(b.title);
  });
}

/** Cheap identity for Goals tab focus reload — skips React commit when display order unchanged. */
export function goalsDisplaySame(prev: readonly Goal[], next: readonly Goal[]): boolean {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i]!;
    const b = next[i]!;
    if (a.id !== b.id || a.updatedAt !== b.updatedAt || a.status !== b.status) return false;
  }
  return true;
}

export function todayGoalPreview(goals: readonly Goal[]): Goal[] {
  return sortGoalsForDisplay(goals.filter((goal) => goal.status === 'active')).slice(0, 3).map((goal) => ({
    ...goal,
    history: [...goal.history],
    milestones: [...goal.milestones],
    reminder: goal.reminder ? { ...goal.reminder, weekdays: [...goal.reminder.weekdays] } : null,
  }));
}
