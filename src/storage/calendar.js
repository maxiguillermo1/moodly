/**
 * @fileoverview Narrow calendar read façade (Calendar tab only — not on Today startup path).
 * @module storage/calendar
 */
export { fetchMoodCalendarSnapshot, getMoodCalendarSnapshotEpoch, peekMoodCalendarSnapshotFromWarmCache, warmMoodCalendarSnapshotCacheIfPrimed, } from '../data/storage/calendarSnapshot';
