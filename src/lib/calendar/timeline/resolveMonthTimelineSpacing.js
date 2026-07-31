/**
 * @fileoverview Viewport-aware month timeline row padding (card-centered scroll / up-down paging).
 * @module lib/calendar/timeline/resolveMonthTimelineSpacing
 */
import { buildFullGridMetrics } from '../../../components/calendar/fullGridLayout';
import { getMonthTimelineSpacing } from '../../../theme/calendarDensity';
import { spacing } from '../../../theme/spacing';
import { CALENDAR_MONTH_TIMELINE_CARD_CENTER_TUNING_PX, CALENDAR_MONTH_TIMELINE_CARD_TOP_Y_RATIO, CALENDAR_MONTH_TIMELINE_INTER_GRID_GAP, } from './constants';
import { maxTimelineMonthCardHeight, minMonthSectionBottomForCardCenterClip, resolveMonthSectionTopForViewportCenteredCard, timelineMonthSectionCardTop, } from './timelineMonthRowMetrics';
/**
 * Row padding when FlashList `initialScrollIndex` aligns row top to the viewport:
 * title at row top (monthSectionTop 0), card below title + gap, bottom pad for month paging.
 */
export function resolveMonthTimelineSpacing(params) {
    const base = getMonthTimelineSpacing(params.fontScale, params.windowWidth);
    const viewportH = Math.max(0, params.listViewportHeight);
    if (viewportH <= 0) {
        return { ...base, monthSectionTop: 0 };
    }
    const horizontalPadding = spacing[4] * 2;
    const innerW = Math.max(0, params.windowWidth - horizontalPadding - 2 * base.monthCardPadding);
    const grid = buildFullGridMetrics(innerW);
    const cardHeight = maxTimelineMonthCardHeight(grid, base.monthCardPadding);
    const monthSectionTop = resolveMonthSectionTopForViewportCenteredCard(viewportH, cardHeight, CALENDAR_MONTH_TIMELINE_CARD_CENTER_TUNING_PX, CALENDAR_MONTH_TIMELINE_CARD_TOP_Y_RATIO);
    const cardTop = timelineMonthSectionCardTop(monthSectionTop);
    const minBottom = minMonthSectionBottomForCardCenterClip(viewportH, cardHeight, cardTop);
    return {
        monthSectionTop,
        monthSectionBottom: Math.max(base.monthSectionBottom, minBottom + CALENDAR_MONTH_TIMELINE_INTER_GRID_GAP),
        monthCardPadding: base.monthCardPadding,
    };
}
