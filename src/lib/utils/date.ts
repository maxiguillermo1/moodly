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

/**
 * Parse YYYY-MM-DD string to Date object
 */
export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format date string for display (e.g., "Thu, Jan 15, 2026")
 */
export function formatDateForDisplay(dateStr: string): string {
  const date = parseISODate(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date string for compact display (e.g., "Jan 15")
 */
export function formatDateCompact(dateStr: string): string {
  const date = parseISODate(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Check if a date string is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getToday();
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
