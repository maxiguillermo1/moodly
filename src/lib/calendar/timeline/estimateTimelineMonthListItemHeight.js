/**
 * @fileoverview FlashList item height for full calendar timeline rows (matches MonthGrid week grid).
 * Lives under `lib/calendar/timeline` so `utils` → `lib/calendar` does not circularly pull UI barrels.
 * @module lib/calendar/timeline/estimateTimelineMonthListItemHeight
 */
import { getTimelineMonthRowMetrics } from './timelineMonthRowMetrics';
export function estimateTimelineMonthListItemHeight(year, monthIndex0, grid, monthCardPadding, monthSectionTopPad, monthSectionBottomPad) {
    return getTimelineMonthRowMetrics(year, monthIndex0, grid, monthCardPadding, monthSectionTopPad, monthSectionBottomPad).rowHeight;
}
