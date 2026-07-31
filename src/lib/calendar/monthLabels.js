/**
 * @fileoverview English month labels for calendar UI (local date math only).
 * @module lib/calendar/monthLabels
 */
export const MONTH_NAMES_EN_LONG = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];
export function monthNameLongEn(monthIndex0) {
    return MONTH_NAMES_EN_LONG[monthIndex0] ?? '';
}
/** Short month names for year overview / compact UI (matches prior CalendarView copy). */
export const MONTH_ABBREV_EN = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];
