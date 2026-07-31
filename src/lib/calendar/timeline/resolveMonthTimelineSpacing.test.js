/**
 * @fileoverview Tests for viewport-aware month timeline row spacing.
 */
import { resolveMonthTimelineSpacing } from './resolveMonthTimelineSpacing';
import { buildFullGridMetrics } from '../../../components/calendar/fullGridLayout';
import { getMonthTimelineSpacing } from '../../../theme/calendarDensity';
import { spacing } from '../../../theme/spacing';
import { getTimelineMonthRowMetrics, maxTimelineMonthCardHeight, minMonthSectionBottomForCardCenterClip, resolveMonthSectionTopForViewportCenteredCard, timelineMonthSectionCardTop, } from './timelineMonthRowMetrics';
import { CALENDAR_MONTH_TIMELINE_CARD_CENTER_TUNING_PX, CALENDAR_MONTH_TIMELINE_CARD_TOP_Y_RATIO, CALENDAR_MONTH_TIMELINE_INTER_GRID_GAP, } from './constants';
describe('resolveMonthTimelineSpacing', () => {
    it('places the card high in the viewport when the row top is aligned', () => {
        const fontScale = 1;
        const windowWidth = 390;
        const listViewportHeight = 677;
        const base = getMonthTimelineSpacing(fontScale, windowWidth);
        const resolved = resolveMonthTimelineSpacing({ fontScale, windowWidth, listViewportHeight });
        const innerW = windowWidth - 2 * spacing[4] - 2 * resolved.monthCardPadding;
        const grid = buildFullGridMetrics(innerW);
        const cardH = maxTimelineMonthCardHeight(grid, resolved.monthCardPadding);
        expect(resolved.monthSectionTop).toBe(resolveMonthSectionTopForViewportCenteredCard(listViewportHeight, cardH, CALENDAR_MONTH_TIMELINE_CARD_CENTER_TUNING_PX, CALENDAR_MONTH_TIMELINE_CARD_TOP_Y_RATIO));
        expect(resolved.monthSectionBottom).toBeGreaterThan(base.monthSectionBottom);
        const cardTop = timelineMonthSectionCardTop(resolved.monthSectionTop);
        const minBottom = minMonthSectionBottomForCardCenterClip(listViewportHeight, cardH, cardTop);
        expect(resolved.monthSectionBottom).toBe(minBottom + CALENDAR_MONTH_TIMELINE_INTER_GRID_GAP);
        expect(cardTop).toBe(33);
        const rowH = getTimelineMonthRowMetrics(2025, 0, grid, resolved.monthCardPadding, resolved.monthSectionTop, resolved.monthSectionBottom).rowHeight;
        expect(rowH).toBeGreaterThanOrEqual(listViewportHeight);
    });
    it('falls back to theme base spacing when viewport height is unknown', () => {
        const fontScale = 1;
        const windowWidth = 390;
        const base = getMonthTimelineSpacing(fontScale, windowWidth);
        expect(resolveMonthTimelineSpacing({ fontScale, windowWidth, listViewportHeight: 0 })).toEqual({
            ...base,
            monthSectionTop: 0,
        });
    });
});
