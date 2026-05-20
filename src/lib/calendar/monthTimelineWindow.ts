/**
 * @fileoverview Bounded month-timeline window math (scroll-end extension, no React).
 * @module lib/calendar/monthTimelineWindow
 */

/** ~100 years of months — large static window avoids periodic recenter hitches. */
export const CALENDAR_MONTH_WINDOW_CAP = 1201;
/** Months to prepend/append when user scrolls near an edge (~10y). */
export const CALENDAR_MONTH_WINDOW_EXTEND = 120;
/** Items from either end that trigger extension. */
export const CALENDAR_MONTH_WINDOW_NEAR_EDGE = 8;

export type MonthWindowOffsets = { start: number; end: number };

export type MonthWindowExtendDirection = 'start' | 'end';

export type MonthWindowExtendResult = {
  offsets: MonthWindowOffsets;
  /** FlashList index to preserve visible month after prepend/trim. */
  recenterIndex: number;
  didMutate: boolean;
};

/**
 * Computes new window offsets when the user scrolls near the start or end of the timeline.
 * @param anchorIndex — visible item index at scroll end (before extension).
 */
export function computeMonthWindowExtension(
  current: MonthWindowOffsets,
  extend: MonthWindowExtendDirection,
  anchorIndex: number,
  options?: {
    cap?: number;
    extendBy?: number;
  }
): MonthWindowExtendResult {
  const cap = options?.cap ?? CALENDAR_MONTH_WINDOW_CAP;
  const extendBy = options?.extendBy ?? CALENDAR_MONTH_WINDOW_EXTEND;

  if (extend === 'start') {
    const newStart = current.start - extendBy;
    let newEnd = current.end;
    const newLen = newEnd - newStart + 1;
    if (newLen > cap) newEnd -= newLen - cap;
    const didMutate = newStart !== current.start || newEnd !== current.end;
    return {
      offsets: { start: newStart, end: newEnd },
      recenterIndex: anchorIndex + extendBy,
      didMutate,
    };
  }

  let newStart = current.start;
  const newEnd = current.end + extendBy;
  const newLen = newEnd - newStart + 1;
  let trimmed = 0;
  if (newLen > cap) {
    trimmed = newLen - cap;
    newStart += trimmed;
  }
  const didMutate = newStart !== current.start || newEnd !== current.end;
  return {
    offsets: { start: newStart, end: newEnd },
    recenterIndex: anchorIndex - trimmed,
    didMutate,
  };
}

export function monthWindowOffsetsKey(offsets: MonthWindowOffsets): string {
  return `${offsets.start}:${offsets.end}`;
}
