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

/**
 * Fixed chrome above the month timeline FlashList (`CalendarScreen` top bar + large-title slot).
 * Paired with safe-area top inset to derive list viewport height for row letterboxing.
 */
export const CALENDAR_MONTH_TIMELINE_HEADER_CHROME = 92;

/** Extra bottom inset beyond the card-center clip minimum (breathing room between month grids). */
export const CALENDAR_MONTH_TIMELINE_INTER_GRID_GAP = 8;

/** Gap between the in-row month title and the calendar card (must match {@link CalendarTimelineMonth}). */
export const CALENDAR_MONTH_TIMELINE_TITLE_CARD_GAP_PX = 1;

/**
 * Pulls the month timeline FlashList upward on screen (negative marginTop on the list).
 * Row layout keeps the title above the card; this offsets fixed chrome above the list.
 */
export const CALENDAR_MONTH_TIMELINE_LIST_PULL_UP_PX = 80;

/**
 * Card top target as a fraction of list viewport height (lower → card sits higher).
 * Clamps at 0 row top inset; the title + gap sit above the card.
 */
export const CALENDAR_MONTH_TIMELINE_CARD_TOP_Y_RATIO = 0.04;

/** Extra subtracted from computed top inset (0 = as high as possible without overlapping the title). */
export const CALENDAR_MONTH_TIMELINE_CARD_CENTER_TUNING_PX = 0;
