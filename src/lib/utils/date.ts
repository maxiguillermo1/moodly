/**
 * @fileoverview Date utility functions
 * @module lib/utils/date
 */

/**
 * Get today's date as YYYY-MM-DD string (local timezone)
 */
export function getToday(): string {
  const now = new Date();
  return formatDateToISO(now);
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Future-date guard (local-day keys).
 *
 * IMPORTANT:
 * - This compares *local-day* date keys in `YYYY-MM-DD` form.
 * - Lexicographic comparison matches chronological order for this format.
 * - Do NOT derive keys from UTC (`toISOString`) anywhere in the app.
 */
export function isFutureDateKey(dateKey: string, todayKey: string): boolean {
  // Defensive: if keys are malformed, fail closed (treat as not future) to avoid blocking valid usage.
  if (typeof dateKey !== 'string' || typeof todayKey !== 'string') return false;
  if (dateKey.length !== 10 || todayKey.length !== 10) return false;
  // "YYYY-MM-DD" sorts naturally.
  return dateKey > todayKey;
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
