/**
 * @fileoverview Local calendar-day key helpers (YYYY-MM-DD). Used by calendar UI + engines.
 * Persistence uses local `Date` components — never UTC `toISOString` for day boundaries.
 * @module lib/utils/dateKeys
 */

import { toLocalDayKey } from './date';

/** Strict YYYY-MM-DD (local day); does not validate calendar validity (e.g. Feb 30). */
const LOCAL_DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type LocalDayKey = string;

export function isValidLocalDayKeyFormat(key: string): boolean {
  return LOCAL_DAY_KEY_RE.test(key);
}

/** First seven chars of `YYYY-MM-DD` → `YYYY-MM`. */
export function monthKeyFromLocalDayKey(dayKey: string): string {
  return dayKey.slice(0, 7);
}

/** Newest-first order for local `YYYY-MM-DD` / `YYYY-MM` keys (lexicographic). */
export function compareLocalDayKeysDesc(a: string, b: string): number {
  if (a < b) return 1;
  if (a > b) return -1;
  return 0;
}

/** 1-based day of month if `dayKey` belongs to `year`/`monthIndex0`, else 0. */
export function dayOfMonthInCalendarMonth(dayKey: string, year: number, monthIndex0: number): number {
  if (!isValidLocalDayKeyFormat(dayKey)) return 0;
  const want = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}`;
  if (!dayKey.startsWith(want + '-')) return 0;
  const d = Number(dayKey.slice(8, 10));
  return Number.isFinite(d) && d >= 1 && d <= 31 ? d : 0;
}

export function localDayKeyFromParts(year: number, monthIndex0: number, day: number): LocalDayKey {
  return toLocalDayKey(new Date(year, monthIndex0, day));
}

export { toLocalDayKey };
