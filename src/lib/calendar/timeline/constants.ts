/**
 * @fileoverview Tunables for the continuous month timeline (FlashList) on CalendarScreen.
 * @module lib/calendar/timeline/constants
 */

/** ~100 years of months; large static window avoids periodic recenter hitches. */
export const TIMELINE_WINDOW_CAP = 1201;

/** Months to grow when the user scrolls near an extreme edge (rare). */
export const TIMELINE_WINDOW_EXTEND = 120;

/** First visible index within this many rows of an end triggers a window-extension plan. */
export const TIMELINE_WINDOW_NEAR_EDGE = 8;

/**
 * Drag release velocity at or above this (points/ms) → list will likely keep scrolling;
 * defer scroll-end commit until `onMomentumScrollEnd`.
 */
export const TIMELINE_DRAG_COMMIT_VY_PMS = 0.05;

/** FlashList viewability: dominant month tracking + stable header updates. */
export const TIMELINE_VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 35,
  minimumViewTime: 48,
} as const;

/**
 * Matches `contentContainerStyle` bottom padding on the month timeline list (`CalendarScreen`).
 * Used when clamping scroll offsets so centered math matches real scrollable height.
 */
export const CALENDAR_MONTH_TIMELINE_LIST_CONTENT_PADDING_BOTTOM = 96;
