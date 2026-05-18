/**
 * @fileoverview Deterministic streak / density calculators over `DayActivity` maps.
 * @module lib/insights/trendCalculators
 */

import type { DayActivity } from '../../types/dailyActivity.types';
import type { LocalDateKey } from '../../types/dailyActivity.types';
import { parseISODate } from '../utils/date';

function dayDiff(a: LocalDateKey, b: LocalDateKey): number | null {
  const da = parseISODate(a);
  const db = parseISODate(b);
  if (!Number.isFinite(da.getTime()) || !Number.isFinite(db.getTime())) return null;
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function sortedKeys(map: Readonly<Record<string, DayActivity>>): LocalDateKey[] {
  return Object.keys(map).sort();
}

/** Longest run of consecutive local days where predicate holds (keys must be contiguous dates). */
export function longestStreakOverSortedDates(
  sortedDates: readonly LocalDateKey[],
  pred: (date: LocalDateKey) => boolean
): number {
  let best = 0;
  let cur = 0;
  let prev: LocalDateKey | null = null;
  for (const d of sortedDates) {
    const ok = pred(d);
    if (!ok) {
      cur = 0;
      prev = d;
      continue;
    }
    if (prev == null) {
      cur = 1;
    } else {
      const diff = dayDiff(prev, d);
      cur = diff === 1 ? cur + 1 : 1;
    }
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

export function maxMoodLoggingStreak(activities: Readonly<Record<string, DayActivity>>): number {
  const keys = sortedKeys(activities);
  return longestStreakOverSortedDates(keys, (d) => {
    const row = activities[d];
    return !!row?.mood.hasEntry;
  });
}

export function countDays(
  activities: Readonly<Record<string, DayActivity>>,
  pred: (row: DayActivity) => boolean
): number {
  let n = 0;
  for (const k of Object.keys(activities)) {
    if (pred(activities[k]!)) n += 1;
  }
  return n;
}
