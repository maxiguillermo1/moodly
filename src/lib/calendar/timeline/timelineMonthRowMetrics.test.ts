/**
 * @fileoverview Tests for month timeline row vertical metrics.
 */

import { buildFullGridMetrics } from '../../../components/calendar/fullGridLayout';
import {
  maxTimelineMonthCardHeight,
  resolveMonthSectionTopForViewportCenteredCard,
  timelineMonthSectionCardTop,
  timelineMonthSectionTitleBlock,
} from './timelineMonthRowMetrics';

describe('resolveMonthSectionTopForViewportCenteredCard', () => {
  const grid = buildFullGridMetrics(340);
  const monthCardPadding = 16;
  const cardH = maxTimelineMonthCardHeight(grid, monthCardPadding);

  it('anchors the card below the title without overlap when the row top is aligned', () => {
    const viewportH = 677;
    const top = resolveMonthSectionTopForViewportCenteredCard(viewportH, cardH, 0, 0.04);
    const cardTop = timelineMonthSectionCardTop(top);
    expect(top).toBe(0);
    expect(cardTop).toBe(timelineMonthSectionTitleBlock());
    expect(cardTop).toBeGreaterThanOrEqual(32);
  });

  it('returns minimum top inset when viewport is too small', () => {
    expect(resolveMonthSectionTopForViewportCenteredCard(0, cardH, 0)).toBe(8);
  });

  it('uses the shared title block height', () => {
    expect(timelineMonthSectionTitleBlock()).toBeGreaterThan(0);
  });
});
