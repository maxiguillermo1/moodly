/**
 * @fileoverview FlashList row height math for variable-height month rows (5 vs 6 weeks).
 * @module lib/calendar/timeline/flashListLayout
 */

import type { FullGridMetrics } from '../../../components/calendar/fullGridLayout';
import { estimateTimelineMonthListItemHeight } from './estimateTimelineMonthListItemHeight';
import type { MonthItem } from '../monthWindow';

export type TimelineFlashListLayoutRef = {
  heights: number[];
  listHeight: number;
};

/** Month row heights depend only on calendar month + grid metrics — cache across window rebuilds. */
const ROW_HEIGHT_CACHE_MAX = 512;
const rowHeightCache = new Map<string, number>();

function timelineRowHeightCacheKey(
  year: number,
  monthIndex0: number,
  fullGridMetrics: FullGridMetrics,
  monthCardPadding: number,
  monthSectionTopPad: number,
  monthSectionBottomPad: number
): string {
  const { cell, gap } = fullGridMetrics;
  return `${year}|${monthIndex0}|${cell}|${gap}|${monthCardPadding}|${monthSectionTopPad}|${monthSectionBottomPad}`;
}

export function getCachedTimelineMonthRowHeight(
  year: number,
  monthIndex0: number,
  fullGridMetrics: FullGridMetrics,
  monthCardPadding: number,
  monthSectionTopPad: number,
  monthSectionBottomPad: number
): number {
  const key = timelineRowHeightCacheKey(
    year,
    monthIndex0,
    fullGridMetrics,
    monthCardPadding,
    monthSectionTopPad,
    monthSectionBottomPad
  );
  const hit = rowHeightCache.get(key);
  if (hit != null) return hit;
  const height = estimateTimelineMonthListItemHeight(
    year,
    monthIndex0,
    fullGridMetrics,
    monthCardPadding,
    monthSectionTopPad,
    monthSectionBottomPad
  );
  if (rowHeightCache.size >= ROW_HEIGHT_CACHE_MAX) {
    const oldest = rowHeightCache.keys().next().value;
    if (oldest != null) rowHeightCache.delete(oldest);
  }
  rowHeightCache.set(key, height);
  return height;
}

/** Test-only: reset row-height memo between cases. */
export function clearTimelineRowHeightCacheForTests(): void {
  rowHeightCache.clear();
}

export function computeMonthTimelineRowHeights(params: {
  monthsData: MonthItem[];
  fullGridMetrics: FullGridMetrics;
  monthCardPadding: number;
  monthSectionTopPad: number;
  monthSectionBottomPad: number;
}): number[] {
  const { monthsData, fullGridMetrics, monthCardPadding, monthSectionTopPad, monthSectionBottomPad } = params;
  const out: number[] = new Array(monthsData.length);
  for (let i = 0; i < monthsData.length; i++) {
    const it = monthsData[i]!;
    out[i] = getCachedTimelineMonthRowHeight(
      it.y,
      it.m,
      fullGridMetrics,
      monthCardPadding,
      monthSectionTopPad,
      monthSectionBottomPad
    );
  }
  return out;
}

export function sumTimelineListHeight(heights: number[]): number {
  return heights.reduce((a, h) => a + h, 0);
}

/** Prefix sums for FlashList row tops (index → content Y). */
export function buildTimelineCumulativeTops(heights: readonly number[]): number[] {
  const tops: number[] = new Array(heights.length);
  let acc = 0;
  for (let i = 0; i < heights.length; i++) {
    tops[i] = acc;
    acc += heights[i] ?? 0;
  }
  return tops;
}
