import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview One month row in the calendar timeline (FlashList item).
 * Memoized so sibling months skip re-render when selection or data for other months changes.
 * @module components/calendar/CalendarTimelineMonth
 */
import React from 'react';
import { View, Text } from 'react-native';
import { MonthGrid } from './MonthGrid';
import { WeekdayRow } from './WeekdayRow';
import { monthNameLongEn } from '../../utils';
function timelineMonthPropsEqual(a, b) {
    return (a.item.key === b.item.key &&
        a.monthEntries === b.monthEntries &&
        a.entriesRevision === b.entriesRevision &&
        a.selectedForThisMonth === b.selectedForThisMonth &&
        a.monthSectionTopPad === b.monthSectionTopPad &&
        a.monthSectionBottomPad === b.monthSectionBottomPad &&
        a.monthCardPadding === b.monthCardPadding &&
        a.fullGridMetrics === b.fullGridMetrics &&
        a.calendarMoodStyle === b.calendarMoodStyle &&
        a.todayKey === b.todayKey &&
        a.onPressDate === b.onPressDate &&
        a.reduceMotion === b.reduceMotion &&
        a.onHapticSelect === b.onHapticSelect &&
        a.moodGradeColorStyle === b.moodGradeColorStyle &&
        a.isDark === b.isDark &&
        a.onCalendarCardInnerLayout === b.onCalendarCardInnerLayout &&
        a.monthSectionTitleMaxFontMult === b.monthSectionTitleMaxFontMult &&
        a.calendarListEpoch === b.calendarListEpoch &&
        a.styles === b.styles);
}
export const CalendarTimelineMonth = React.memo(function CalendarTimelineMonth({ item, monthEntries, entriesRevision, selectedForThisMonth, monthSectionTopPad, monthSectionBottomPad, monthCardPadding, fullGridMetrics, calendarMoodStyle, todayKey, onPressDate, reduceMotion, onHapticSelect, moodGradeColorStyle, isDark, onCalendarCardInnerLayout, monthSectionTitleMaxFontMult, calendarListEpoch, styles: s, }) {
    const title = monthNameLongEn(item.m);
    return (_jsxs(View, { style: [
            s.monthSection,
            { paddingTop: monthSectionTopPad, paddingBottom: monthSectionBottomPad },
        ], accessibilityRole: "none", children: [_jsx(Text, { style: s.monthSectionTitle, allowFontScaling: true, maxFontSizeMultiplier: monthSectionTitleMaxFontMult, accessibilityRole: "header", accessibilityLabel: `${title} ${item.y}`, children: title }), _jsxs(View, { style: [s.calendarCard, { padding: monthCardPadding }], onLayout: onCalendarCardInnerLayout, children: [_jsx(WeekdayRow, { variant: "full", fullGridLayout: fullGridMetrics }), _jsx(MonthGrid, { year: item.y, monthIndex0: item.m, variant: "full", entries: monthEntries, entriesRevision: entriesRevision, calendarMoodStyle: calendarMoodStyle, todayKey: todayKey, selectedDate: selectedForThisMonth, onPressDate: onPressDate, reduceMotion: reduceMotion, onHapticSelect: onHapticSelect, fullGridLayout: fullGridMetrics, moodGradeColorStyle: moodGradeColorStyle, isDark: isDark, recycleGuardEpoch: calendarListEpoch })] })] }));
}, timelineMonthPropsEqual);
