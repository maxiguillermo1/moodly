/**
 * @fileoverview Date utility functions
 * @module lib/utils/date
 */

/**
 * Get today's date as YYYY-MM-DD string (local timezone)
 */
export function getToday(): string {
  const now = new Date();
  return toLocalDayKey(now);
}

/**
 * Canonical local-day key for persistence and comparisons.
 *
 * IMPORTANT:
 * - Derived strictly from local calendar components (getFullYear/getMonth/getDate).
 * - Never derive keys from UTC (`toISOString`) anywhere in the app.
 */
export function toLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Back-compat alias: this app historically used `formatDateToISO` for local-day keys.
 */
export function formatDateToISO(date: Date): string {
  return toLocalDayKey(date);
}

/**
 * Milliseconds until the next local midnight.
 *
 * Used to schedule a single day-boundary timer (no polling).
 * DST-safe: uses local Date construction for the next day at 00:00.
 */
export function msUntilNextLocalMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const ms = next.getTime() - now.getTime();
  // Defensive clamp: timers cannot accept negative/NaN delays.
  return Number.isFinite(ms) && ms > 0 ? ms : 1;
}

const LOCAL_DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function isFiniteLocalCalendarDate(y: number, m0: number, d: number): boolean {
  const dt = new Date(y, m0, d);
  return dt.getFullYear() === y && dt.getMonth() === m0 && dt.getDate() === d;
}

/**
 * Parse YYYY-MM-DD (local calendar day) to a Date at local midnight.
 * Malformed keys or impossible calendar dates yield an invalid Date — callers
 * should use `isNaN(d.getTime())` or the safe formatters below.
 */
export function parseISODate(dateStr: string): Date {
  if (!LOCAL_DAY_KEY.test(dateStr)) {
    return new Date(NaN);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date(NaN);
  }
  if (!isFiniteLocalCalendarDate(year, month - 1, day)) {
    return new Date(NaN);
  }
  return new Date(year, month - 1, day);
}

/**
 * True if `dateStr` is a real local calendar day in `YYYY-MM-DD` form (leap years, month lengths).
 * Prefer this over regex-only checks for navigation params and calendar taps.
 */
export function isValidLocalCalendarDayKey(dateStr: string): boolean {
  return Number.isFinite(parseISODate(dateStr).getTime());
}

/**
 * Normalize route/deep-link day params: invalid or non-string values fall back to today (local).
 */
export function coerceLocalDayKeyOrToday(value: unknown): string {
  return typeof value === 'string' && isValidLocalCalendarDayKey(value) ? value : getToday();
}

/**
 * Format date string for display (e.g., "Thu, Jan 15, 2026")
 */
export function formatDateForDisplay(dateStr: string): string {
  const date = parseISODate(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr.trim() || '—';
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get relative day label (Today, Yesterday, or formatted date)
 */
export function getRelativeDayLabel(dateStr: string): string {
  const today = getToday();
  if (dateStr === today) return 'Today';
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === formatDateToISO(yesterday)) return 'Yesterday';
  
  return formatDateForDisplay(dateStr);
}
