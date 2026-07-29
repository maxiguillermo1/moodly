/**
 * @fileoverview FlashList row height cache for month timeline.
 */

import { buildFullGridMetrics } from '../../../components/calendar/fullGridLayout';
import {
  clearTimelineRowHeightCacheForTests,
  computeMonthTimelineRowHeights,
  getCachedTimelineMonthRowHeight,
} from './flashListLayout';
import { buildMonthWindow } from '../monthWindow';

describe('flashListLayout row height cache', () => {
  const grid = buildFullGridMetrics(320);
  const monthCardPadding = 12;
  const monthSectionTopPad = 8;
  const monthSectionBottomPad = 24;

  beforeEach(() => {
    clearTimelineRowHeightCacheForTests();
  });

  it('returns stable heights for the same month + grid metrics', () => {
    const a = getCachedTimelineMonthRowHeight(2024, 1, grid, monthCardPadding, monthSectionTopPad, monthSectionBottomPad);
    const b = getCachedTimelineMonthRowHeight(2024, 1, grid, monthCardPadding, monthSectionTopPad, monthSectionBottomPad);
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(200);
  });

  it('differs when grid metrics change', () => {
    const narrow = buildFullGridMetrics(280);
    const wide = buildFullGridMetrics(360);
    const narrowH = getCachedTimelineMonthRowHeight(2024, 1, narrow, monthCardPadding, monthSectionTopPad, monthSectionBottomPad);
    const wideH = getCachedTimelineMonthRowHeight(2024, 1, wide, monthCardPadding, monthSectionTopPad, monthSectionBottomPad);
    expect(narrowH).not.toBe(wideH);
  });

  it('computeMonthTimelineRowHeights fills one entry per month', () => {
    const anchor = new Date(2024, 5, 1);
    const months = buildMonthWindow(anchor, -2, 2);
    const heights = computeMonthTimelineRowHeights({
      monthsData: months,
      fullGridMetrics: grid,
      monthCardPadding,
      monthSectionTopPad,
      monthSectionBottomPad,
    });
    expect(heights).toHaveLength(5);
    heights.forEach((h) => expect(h).toBeGreaterThan(0));
  });
});
