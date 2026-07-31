/**
 * @fileoverview FlashList row height math for variable-height month rows (5 vs 6 weeks).
 * @module lib/calendar/timeline/flashListLayout
 */
import { estimateTimelineMonthListItemHeight } from './estimateTimelineMonthListItemHeight';
/** Month row heights depend only on calendar month + grid metrics — cache across window rebuilds. */
const ROW_HEIGHT_CACHE_MAX = 512;
const rowHeightCache = new Map();
function timelineRowHeightCacheKey(year, monthIndex0, fullGridMetrics, monthCardPadding, monthSectionTopPad, monthSectionBottomPad) {
    const { cell, gap } = fullGridMetrics;
    return `${year}|${monthIndex0}|${cell}|${gap}|${monthCardPadding}|${monthSectionTopPad}|${monthSectionBottomPad}`;
}
export function getCachedTimelineMonthRowHeight(year, monthIndex0, fullGridMetrics, monthCardPadding, monthSectionTopPad, monthSectionBottomPad) {
    const key = timelineRowHeightCacheKey(year, monthIndex0, fullGridMetrics, monthCardPadding, monthSectionTopPad, monthSectionBottomPad);
    const hit = rowHeightCache.get(key);
    if (hit != null)
        return hit;
    const height = estimateTimelineMonthListItemHeight(year, monthIndex0, fullGridMetrics, monthCardPadding, monthSectionTopPad, monthSectionBottomPad);
    if (rowHeightCache.size >= ROW_HEIGHT_CACHE_MAX) {
        const oldest = rowHeightCache.keys().next().value;
        if (oldest != null)
            rowHeightCache.delete(oldest);
    }
    rowHeightCache.set(key, height);
    return height;
}
/** Test-only: reset row-height memo between cases. */
export function clearTimelineRowHeightCacheForTests() {
    rowHeightCache.clear();
}
export function computeMonthTimelineRowHeights(params) {
    const { monthsData, fullGridMetrics, monthCardPadding, monthSectionTopPad, monthSectionBottomPad } = params;
    const out = new Array(monthsData.length);
    for (let i = 0; i < monthsData.length; i++) {
        const it = monthsData[i];
        out[i] = getCachedTimelineMonthRowHeight(it.y, it.m, fullGridMetrics, monthCardPadding, monthSectionTopPad, monthSectionBottomPad);
    }
    return out;
}
export function sumTimelineListHeight(heights) {
    return heights.reduce((a, h) => a + h, 0);
}
/** Prefix sums for FlashList row tops (index → content Y). */
export function buildTimelineCumulativeTops(heights) {
    const tops = new Array(heights.length);
    let acc = 0;
    for (let i = 0; i < heights.length; i++) {
        tops[i] = acc;
        acc += heights[i] ?? 0;
    }
    return tops;
}
