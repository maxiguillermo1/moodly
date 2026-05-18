/**
 * @fileoverview Local calendar window helpers for insights (no UTC day slicing).
 * @module lib/insights/periodBounds
 */

import { isValidLocalCalendarDayKey, parseISODate, toLocalDayKey } from '../utils/date';

export function addLocalDays(dayKey: string, deltaDays: number): string {
  if (!isValidLocalCalendarDayKey(dayKey)) return dayKey;
  const d = parseISODate(dayKey);
  if (!Number.isFinite(d.getTime())) return dayKey;
  d.setDate(d.getDate() + deltaDays);
  return toLocalDayKey(d);
}

/** First day of the calendar month containing `dayInMonth` (must be valid local day). */
export function startOfMonthContaining(dayInMonth: string): string {
  if (!isValidLocalCalendarDayKey(dayInMonth)) return dayInMonth;
  return `${dayInMonth.slice(0, 7)}-01`;
}

/** Last calendar day of the month containing `dayInMonth`. */
export function endOfMonthContaining(dayInMonth: string): string {
  if (!isValidLocalCalendarDayKey(dayInMonth)) return dayInMonth;
  const d = parseISODate(dayInMonth);
  if (!Number.isFinite(d.getTime())) return dayInMonth;
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return toLocalDayKey(end);
}
