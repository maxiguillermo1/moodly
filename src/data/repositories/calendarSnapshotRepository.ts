/**
 * @fileoverview Calendar read façade: mood entries grouped by month + calendar display settings.
 * @module data/repositories/calendarSnapshotRepository
 *
 * **Name:** “Snapshot” reflects one composed read (entries index + settings), not a generic “query”.
 */

import * as calendarSnapshot from '../storage/calendarSnapshot';

export * from '../storage/calendarSnapshot';

export const calendarSnapshotRepository = {
  fetchMoodCalendarSnapshot: calendarSnapshot.fetchMoodCalendarSnapshot,
} as const;

export type ICalendarSnapshotRepository = typeof calendarSnapshotRepository;
