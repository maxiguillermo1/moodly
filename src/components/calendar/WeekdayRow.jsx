import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Weekday row calendar grids — Dynamic Type capped for density.
 * @module components/calendar/WeekdayRow
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme, getCalendarTextLimits } from '../../theme';
const WEEKDAYS_MINI = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WeekdayRow = React.memo(function WeekdayRow({ variant, fullGridLayout }) {
    const { system, fontScale, windowWidth } = useAppTheme();
    const limits = useMemo(() => getCalendarTextLimits(fontScale, windowWidth), [fontScale, windowWidth]);
    const miniStyle = useMemo(() => [styles.miniText, { color: system.tertiaryLabel }], [system.tertiaryLabel]);
    const fullStyle = useMemo(() => [styles.fullText, { color: system.secondaryLabel }], [system.secondaryLabel]);
    if (variant === 'mini') {
        return (_jsx(View, { style: styles.miniRow, accessible: false, children: WEEKDAYS_MINI.map((d, idx) => (_jsx(Text, { style: miniStyle, allowFontScaling: true, maxFontSizeMultiplier: limits.weekdayMini, children: d }, `wd-${idx}`))) }));
    }
    if (fullGridLayout) {
        const { cell, gap } = fullGridLayout;
        return (_jsx(View, { style: [styles.fullRowUniform, { columnGap: gap, marginBottom: gap }], accessibilityRole: "header", accessibilityLabel: "Weekdays, Sunday through Saturday", children: WEEKDAYS_MINI.map((d, idx) => (_jsx(Text, { style: [fullStyle, { width: cell }], allowFontScaling: true, maxFontSizeMultiplier: limits.weekdayFull, children: d }, `wd-${idx}`))) }));
    }
    return (_jsx(View, { style: styles.fullRow, accessibilityRole: "header", accessibilityLabel: "Weekdays, Sunday through Saturday", children: WEEKDAYS_MINI.map((d, idx) => (_jsx(Text, { style: fullStyle, allowFontScaling: true, maxFontSizeMultiplier: limits.weekdayFull, children: d }, `wd-${idx}`))) }));
});
const styles = StyleSheet.create({
    miniRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    miniText: {
        fontSize: 8,
        lineHeight: 9,
        width: 14,
        textAlign: 'center',
        fontWeight: '600',
    },
    fullRowUniform: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        width: '100%',
    },
    fullRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    fullText: {
        fontSize: 11,
        lineHeight: 12,
        width: 44,
        textAlign: 'center',
        fontWeight: '600',
    },
});
