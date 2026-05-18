/**
 * @fileoverview FlashList item height for full calendar timeline rows (matches MonthGrid week grid).
 * Lives under `lib/calendar/timeline` so `utils` → `lib/calendar` does not circularly pull UI barrels.
 * @module lib/calendar/timeline/estimateTimelineMonthListItemHeight
 */

import type { FullGridMetrics } from '../../../components/calendar/fullGridLayout';
import { getTimelineMonthRowMetrics } from './timelineMonthRowMetrics';

export function estimateTimelineMonthListItemHeight(
  year: number,
  monthIndex0: number,
  grid: FullGridMetrics,
  monthCardPadding: number,
  monthSectionTopPad: number,
  monthSectionBottomPad: number
): number {
  return getTimelineMonthRowMetrics(
    year,
    monthIndex0,
    grid,
    monthCardPadding,
    monthSectionTopPad,
    monthSectionBottomPad
  ).rowHeight;
}
