/**
 * @fileoverview Tests for card-centered timeline scroll offset.
 */

import { buildFullGridMetrics } from '../../../components/calendar/fullGridLayout';
import type { MonthItem } from '../monthWindow';
import { computeCardCenteredTimelineScrollOffset, resolveCardCenteredTimelineScrollOffset } from './computeCardCenteredTimelineScrollOffset';
import { computeMonthTimelineRowHeights } from './flashListLayout';
import { getTimelineMonthRowMetrics, minMonthSectionBottomForCardCenterClip } from './timelineMonthRowMetrics';

describe('minMonthSectionBottomForCardCenterClip', () => {
  const cardTop = getTimelineMonthRowMetrics(2025, 0, buildFullGridMetrics(340), 16, 12, 0).cardTop;

  it('returns 0 when viewport is not taller than card', () => {
    expect(minMonthSectionBottomForCardCenterClip(400, 500, cardTop)).toBe(0);
  });

  it('requires enough bottom to center the card and make the row at least as tall as the viewport', () => {
    const vh = 800;
    const cardH = 400;
    const minB = minMonthSectionBottomForCardCenterClip(vh, cardH, cardTop);
    expect(minB).toBe(
      Math.max(Math.ceil(vh / 2 - cardH / 2 - 1), Math.ceil(vh - cardTop - cardH - 1))
    );
  });
});

describe('computeCardCenteredTimelineScrollOffset', () => {
  const grid = buildFullGridMetrics(340);
  const monthCardPadding = 16;
  const monthSectionTopPad = 12;
  const monthSectionBottomPad = 220;

  function layoutTwoMonths(): {
    monthsData: MonthItem[];
    cumulativeTops: number[];
    heights: number[];
  } {
    const monthsData: MonthItem[] = [
      { y: 2025, m: 0, key: '2025-01' },
      { y: 2025, m: 1, key: '2025-02' },
    ];
    const heights = computeMonthTimelineRowHeights({
      monthsData,
      fullGridMetrics: grid,
      monthCardPadding,
      monthSectionTopPad,
      monthSectionBottomPad,
    });
    const cumulativeTops = [0, heights[0]!];
    return { monthsData, cumulativeTops, heights };
  }

  it('keeps the next month below the viewport when centering the card', () => {
    const { monthsData, cumulativeTops, heights } = layoutTwoMonths();
    const h0 = heights[0]!;
    // If the viewport is taller than the row, even y=0 shows the next month; use a realistic shorter list window.
    const vh = Math.max(200, Math.floor(h0 - 48));
    const o = computeCardCenteredTimelineScrollOffset({
      monthsData,
      cumulativeTops,
      heights,
      index: 0,
      viewportHeight: vh,
      contentPaddingBottom: 96,
      grid,
      monthCardPadding,
      monthSectionTopPad,
      monthSectionBottomPad,
    });
    const nextTop = cumulativeTops[1]!;
    expect(o + vh).toBeLessThanOrEqual(nextTop + 0.5);
  });

  it('clamps to max scroll', () => {
    const monthsData: MonthItem[] = [{ y: 2025, m: 0, key: '2025-01' }];
    const heights = computeMonthTimelineRowHeights({
      monthsData,
      fullGridMetrics: grid,
      monthCardPadding,
      monthSectionTopPad,
      monthSectionBottomPad,
    });
    const cumulativeTops = [0];
    const vh = 2000;
    const o = computeCardCenteredTimelineScrollOffset({
      monthsData,
      cumulativeTops,
      heights,
      index: 0,
      viewportHeight: vh,
      contentPaddingBottom: 0,
      grid,
      monthCardPadding,
      monthSectionTopPad,
      monthSectionBottomPad,
    });
    expect(o).toBe(0);
  });

  it('applies nudgeUpPx on top of the centered offset', () => {
    const { monthsData, cumulativeTops, heights } = layoutTwoMonths();
    const vh = Math.max(200, Math.floor((heights[0] ?? 0) - 48));
    const base = computeCardCenteredTimelineScrollOffset({
      monthsData,
      cumulativeTops,
      heights,
      index: 0,
      viewportHeight: vh,
      contentPaddingBottom: 96,
      grid,
      monthCardPadding,
      monthSectionTopPad,
      monthSectionBottomPad,
    });
    const nudged = resolveCardCenteredTimelineScrollOffset({
      monthsData,
      heights,
      index: 0,
      viewportHeight: vh,
      contentPaddingBottom: 96,
      grid,
      monthCardPadding,
      monthSectionTopPad,
      monthSectionBottomPad,
      nudgeUpPx: 12,
    });
    expect(nudged).toBe(base + 12);
  });
});
