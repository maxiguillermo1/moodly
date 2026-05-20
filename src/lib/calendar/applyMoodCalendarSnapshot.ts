/**
 * @fileoverview Apply calendar snapshot to screen state (month timeline + year grid).
 * React runs functional updaters synchronously when scheduling state — flags are reliable here.
 * @module lib/calendar/applyMoodCalendarSnapshot
 */

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { MoodEntry } from '../../types';
import type { CalendarMoodStyle } from '../../types/settings.types';

export type MoodCalendarSnapshotShape = {
  byMonthKey: Record<string, Record<string, MoodEntry>>;
  calendarMoodStyle: CalendarMoodStyle;
};

export type ApplyMoodCalendarSnapshotArgs = {
  snapshot: MoodCalendarSnapshotShape;
  setEntriesByMonthKey: Dispatch<SetStateAction<Record<string, Record<string, MoodEntry>>>>;
  setCalendarMoodStyle: Dispatch<SetStateAction<CalendarMoodStyle>>;
  entriesRevisionRef: MutableRefObject<number>;
  onMutated?: () => void;
};

/** @returns true when month map or mood style reference changed. */
export function applyMoodCalendarSnapshot({
  snapshot: { byMonthKey, calendarMoodStyle: nextStyle },
  setEntriesByMonthKey,
  setCalendarMoodStyle,
  entriesRevisionRef,
  onMutated,
}: ApplyMoodCalendarSnapshotArgs): boolean {
  let entriesChanged = false;
  let styleChanged = false;

  setEntriesByMonthKey((prev) => {
    if (prev === (byMonthKey as typeof prev)) return prev;
    entriesRevisionRef.current += 1;
    entriesChanged = true;
    return byMonthKey as typeof prev;
  });

  setCalendarMoodStyle((prev) => {
    if (prev === nextStyle) return prev;
    styleChanged = true;
    return nextStyle;
  });

  const changed = entriesChanged || styleChanged;
  if (changed) onMutated?.();
  return changed;
}
