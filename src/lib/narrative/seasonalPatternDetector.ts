/**
 * @fileoverview **Seasonal / rhythm** — weekday vs weekend activity balance (observational).
 * @module lib/narrative/seasonalPatternDetector
 */

import type { DaySignalRow } from './daySignals';

export type WeekendRhythm = {
  weekendActive: number;
  weekendTotal: number;
  weekdayActive: number;
  weekdayTotal: number;
  weekendRate: number;
  weekdayRate: number;
  /** Enough coverage + a modest gap between rates. */
  notableWeekendLean: boolean;
};

export function detectWeekendWeekdayRhythm(rows: readonly DaySignalRow[]): WeekendRhythm {
  let weekendActive = 0;
  let weekendTotal = 0;
  let weekdayActive = 0;
  let weekdayTotal = 0;
  for (const r of rows) {
    if (r.isWeekend) {
      weekendTotal += 1;
      if (r.hasActivity) weekendActive += 1;
    } else {
      weekdayTotal += 1;
      if (r.hasActivity) weekdayActive += 1;
    }
  }
  const weekendRate = weekendTotal > 0 ? weekendActive / weekendTotal : 0;
  const weekdayRate = weekdayTotal > 0 ? weekdayActive / weekdayTotal : 0;
  const notableWeekendLean =
    weekendTotal >= 8 &&
    weekdayTotal >= 12 &&
    weekendRate - weekdayRate >= 0.12 &&
    weekendActive >= 4;
  return { weekendActive, weekendTotal, weekdayActive, weekdayTotal, weekendRate, weekdayRate, notableWeekendLean };
}
