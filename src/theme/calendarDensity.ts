/**
 * @fileoverview Dynamic Type + width aware limits for dense calendar UI.
 * @module theme/calendarDensity
 */

export type CalendarTextLimits = {
  monthSectionTitle: number;
  weekdayMini: number;
  weekdayFull: number;
  monthGridDayFull: number;
  miniMonthTitle: number;
};

/**
 * Caps text scaling on tight surfaces so layout stays stable under Accessibility sizes.
 */
export function getCalendarTextLimits(fontScale: number, windowWidth: number): CalendarTextLimits {
  const compactWidth = windowWidth > 0 && windowWidth < 390;
  const fs = Math.min(Math.max(fontScale, 1), 1.45);

  return {
    monthSectionTitle: compactWidth ? Math.min(1.22, 1.1 + (1.34 - fs) * 0.35) : Math.min(1.28, 1.15 + (1.34 - fs) * 0.28),
    weekdayMini: compactWidth ? 1.1 : 1.18,
    weekdayFull: 1.26,
    monthGridDayFull: compactWidth ? 1.22 : 1.3,
    miniMonthTitle: compactWidth ? 1.15 : 1.22,
  };
}

import { spacing as spacingToken } from './spacing';

/**
 * Sub-pixel padding nudges for month stacks (full calendar timeline).
 * Extra top inset letterboxes each row: when a month sits near the vertical middle of the
 * viewport, the grid can extend below the visible area while peek fade transitions stay the same.
 */
export function getMonthTimelineSpacing(fontScale: number, windowWidth: number): {
  monthSectionTop: number;
  monthSectionBottom: number;
  monthCardPadding: number;
} {
  const compact = windowWidth > 0 && windowWidth < 390;
  const fs = Math.min(Math.max(fontScale, 1), 1.4);
  const base = compact ? 36 : spacingToken[10];
  const extra = Math.max(0, fs - 1) * 7;
  /** Top inset for the month label + card; smaller values sit the grid higher in the row. */
  const topBase = compact ? spacingToken[6] : spacingToken[10];
  const topExtra = Math.max(0, fs - 1) * 6;
  return {
    monthSectionTop: topBase + topExtra,
    monthSectionBottom: base + extra + spacingToken[3],
    monthCardPadding: compact ? spacingToken[3] + 2 : spacingToken[4],
  };
}
