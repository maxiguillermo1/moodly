/**
 * @fileoverview Scroll offset to vertically center the **calendar card** in the list viewport
 * while keeping the next month row below the visible area when possible.
 * @module lib/calendar/timeline/computeCardCenteredTimelineScrollOffset
 */

import type { FullGridMetrics } from '../../../components/calendar/fullGridLayout';
import { buildTimelineCumulativeTops } from './flashListLayout';
import { getTimelineMonthRowMetrics } from './timelineMonthRowMetrics';

export function computeCardCenteredTimelineScrollOffset(params: {
  monthsData: readonly { y: number; m: number }[];
  cumulativeTops: readonly number[];
  heights: readonly number[];
  index: number;
  viewportHeight: number;
  contentPaddingBottom: number;
  grid: FullGridMetrics;
  monthCardPadding: number;
  monthSectionTopPad: number;
  monthSectionBottomPad: number;
}): number {
  const {
    monthsData,
    cumulativeTops,
    heights,
    index,
    viewportHeight,
    contentPaddingBottom,
    grid,
    monthCardPadding,
    monthSectionTopPad,
    monthSectionBottomPad,
  } = params;
  const n = heights.length;
  if (n === 0 || viewportHeight <= 0 || monthsData.length === 0) return 0;
  const i = Math.max(0, Math.min(Math.floor(index), n - 1, monthsData.length - 1));
  const rowTop = cumulativeTops[i] ?? 0;
  const it = monthsData[i]!;
  const { cardTop, cardHeight } = getTimelineMonthRowMetrics(
    it.y,
    it.m,
    grid,
    monthCardPadding,
    monthSectionTopPad,
    monthSectionBottomPad
  );
  const cardCenterAbs = rowTop + cardTop + cardHeight / 2;
  const yIdeal = cardCenterAbs - viewportHeight / 2;

  const lastTop = cumulativeTops[n - 1] ?? 0;
  const lastH = heights[n - 1] ?? 0;
  const contentHeight = lastTop + lastH + Math.max(0, contentPaddingBottom);
  const maxScroll = Math.max(0, contentHeight - viewportHeight);

  const yCapNext =
    i + 1 < n ? (cumulativeTops[i + 1] ?? 0) - viewportHeight : maxScroll;

  return Math.max(0, Math.min(yIdeal, yCapNext, maxScroll));
}

/** Card-centered offset for a month index; builds cumulative tops from row heights. */
export function resolveCardCenteredTimelineScrollOffset(params: {
  monthsData: readonly { y: number; m: number }[];
  heights: readonly number[];
  index: number;
  viewportHeight: number;
  contentPaddingBottom: number;
  grid: FullGridMetrics;
  monthCardPadding: number;
  monthSectionTopPad: number;
  monthSectionBottomPad: number;
  /** Extra scroll (points) to shift the card upward on screen. */
  nudgeUpPx?: number;
}): number {
  const { nudgeUpPx, heights, ...rest } = params;
  const cumulativeTops = buildTimelineCumulativeTops(heights);
  const base = computeCardCenteredTimelineScrollOffset({ ...rest, cumulativeTops, heights });
  return base + Math.max(0, nudgeUpPx ?? 0);
}
