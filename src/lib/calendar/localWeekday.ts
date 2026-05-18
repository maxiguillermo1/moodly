/**
 * @fileoverview Local-calendar weekday helpers (Sun=0 … Sat=6).
 *
 * Matches `Date#getDay()` for `(year, monthIndex0, day)` in the device local timezone,
 * without allocating one `Date` per day of month.
 *
 * @module lib/calendar/localWeekday
 */

/** Weekday index for the first day of the month (0..6). */
export function localFirstWeekdayOfMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0, 1).getDay();
}

/**
 * Weekday for `day` (1..31) in the given month; equivalent to
 * `new Date(year, monthIndex0, day).getDay()`.
 */
export function localWeekdayForMonthDay(year: number, monthIndex0: number, day: number): number {
  const first = localFirstWeekdayOfMonth(year, monthIndex0);
  return (first + day - 1) % 7;
}

/**
 * Writes weekday indices into `out[d]` for d = 1..31. Index 0 is left unchanged.
 */
export function fillLocalWeekdaysForMonthDays1to31(
  year: number,
  monthIndex0: number,
  out: number[]
): void {
  const first = localFirstWeekdayOfMonth(year, monthIndex0);
  for (let d = 1; d <= 31; d++) {
    out[d] = (first + d - 1) % 7;
  }
}
