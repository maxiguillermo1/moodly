/**
 * @fileoverview Navigation/route parsing for CalendarScreen month timeline anchor & selection.
 * @module lib/calendar/timeline/routeParams
 */

import { formatDateToISO, isValidLocalCalendarDayKey, parseISODate } from '../../utils/date';

export function readAnchorDateFromRouteParams(params: unknown): Date {
  const p = params as { year?: unknown; month?: unknown; date?: unknown } | undefined;
  const y = p?.year;
  const m = p?.month;
  const date = p?.date;
  if (typeof date === 'string' && isValidLocalCalendarDayKey(date)) {
    const parsed = parseISODate(date);
    return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  }
  const hasValid =
    typeof y === 'number' &&
    Number.isFinite(y) &&
    typeof m === 'number' &&
    Number.isFinite(m) &&
    m >= 0 &&
    m <= 11;
  const deviceToday = new Date();
  return hasValid ? new Date(y as number, m as number, 1) : new Date(deviceToday.getFullYear(), deviceToday.getMonth(), 1);
}

export function readInitialSelectedDayKeyFromRoute(params: unknown, anchor: Date): string {
  const p = params as { year?: unknown; month?: unknown; date?: unknown } | undefined;
  const y = p?.year;
  const m = p?.month;
  const date = p?.date;
  if (typeof date === 'string' && isValidLocalCalendarDayKey(date)) {
    return date;
  }
  const hasValid =
    typeof y === 'number' &&
    Number.isFinite(y) &&
    typeof m === 'number' &&
    Number.isFinite(m) &&
    m >= 0 &&
    m <= 11;
  if (hasValid) {
    return formatDateToISO(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  }
  return formatDateToISO(new Date());
}
