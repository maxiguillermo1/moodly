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
    out[i] = estimateTimelineMonthListItemHeight(
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
