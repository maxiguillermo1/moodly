/**
 * @fileoverview Month timeline row / card vertical metrics (must match {@link CalendarTimelineMonth}).
 * @module lib/calendar/timeline/timelineMonthRowMetrics
 */
import { typography } from '../../../theme/typography';
import { spacing } from '../../../theme/spacing';
import { getMonthMatrix } from '../monthMatrix';
import { CALENDAR_MONTH_TIMELINE_TITLE_CARD_GAP_PX } from './constants';
/** Weekday row: {@link WeekdayRow} full uses lineHeight 12 + marginBottom = grid gap. */
const WEEKDAY_FULL_LINE = 12;
/** Month label block above the calendar card (matches {@link CalendarTimelineMonth}). */
export function timelineMonthSectionTitleBlock() {
    return (typography.title1.lineHeight ?? 32) + CALENDAR_MONTH_TIMELINE_TITLE_CARD_GAP_PX;
}
/**
 * Top inset so when FlashList aligns the row top to the viewport, the card top sits near
 * `viewportHeight * cardTopYRatio` (title remains above the card).
 */
export function resolveMonthSectionTopForViewportCenteredCard(viewportHeight, _cardHeight, tuningPx = 0, cardTopYRatio = 0.06) {
    if (viewportHeight <= 0)
        return spacing[2];
    const titleBlock = timelineMonthSectionTitleBlock();
    const ratio = Math.min(Math.max(cardTopYRatio, 0.02), 0.2);
    const raw = Math.floor(viewportHeight * ratio - titleBlock - tuningPx);
    return Math.max(0, raw);
}
/**
 * Vertical layout for one month row: matches `estimateTimelineMonthListItemHeight` + `CalendarTimelineMonth`.
 */
export function getTimelineMonthRowMetrics(year, monthIndex0, grid, monthCardPadding, monthSectionTopPad, monthSectionBottomPad) {
    const weekRows = getMonthMatrix(year, monthIndex0).length;
    const { cell, gap } = grid;
    const gridBodyH = weekRows * cell + Math.max(0, weekRows - 1) * gap;
    const titleBlock = timelineMonthSectionTitleBlock();
    const weekdayBlock = WEEKDAY_FULL_LINE + gap;
    const cardVerticalPadding = 2 * monthCardPadding;
    const cardHeight = cardVerticalPadding + weekdayBlock + gridBodyH;
    const cardTop = monthSectionTopPad + titleBlock;
    const rowHeight = Math.ceil(monthSectionTopPad + titleBlock + cardVerticalPadding + weekdayBlock + gridBodyH + monthSectionBottomPad + 1);
    return { rowHeight, cardTop, cardHeight };
}
/**
 * Maximum calendar-card height for any month (matrix is always 6 week rows in this app).
 */
export function maxTimelineMonthCardHeight(grid, monthCardPadding) {
    const weekRows = 6;
    const { cell, gap } = grid;
    const gridBodyH = weekRows * cell + Math.max(0, weekRows - 1) * gap;
    const weekdayBlock = WEEKDAY_FULL_LINE + gap;
    const cardVerticalPadding = 2 * monthCardPadding;
    return cardVerticalPadding + weekdayBlock + gridBodyH;
}
/** Title + gap offset to the rounded card (same as {@link getTimelineMonthRowMetrics}). */
export function timelineMonthSectionCardTop(monthSectionTopPad) {
    return monthSectionTopPad + timelineMonthSectionTitleBlock();
}
/**
 * Minimum `monthSectionBottomPad` so we can both:
 * - vertically center the card in the list viewport (`cardTop + cardHeight/2 + viewportH/2 <= rowHeight`), and
 * - keep the next month off-screen when possible (`rowHeight >= viewportHeight` so `y = rowHeight - viewportH` is valid).
 */
export function minMonthSectionBottomForCardCenterClip(viewportHeight, cardHeight, cardTop) {
    if (viewportHeight <= 0)
        return 0;
    const forCenter = Math.ceil(viewportHeight / 2 - cardHeight / 2 - 1);
    const forRowCoversViewport = Math.ceil(viewportHeight - cardTop - cardHeight - 1);
    return Math.max(0, forCenter, forRowCoversViewport);
}
