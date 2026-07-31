/**
 * @fileoverview Mood entries map accessors for calendar month rows (no React).
 * @module lib/calendar/timeline/moodEntriesLookup
 */
export const EMPTY_MONTH_ENTRIES = Object.freeze({});
export function getMonthEntriesFromNestedMap(entriesByMonthKey, monthKey) {
    return entriesByMonthKey[monthKey] ?? EMPTY_MONTH_ENTRIES;
}
