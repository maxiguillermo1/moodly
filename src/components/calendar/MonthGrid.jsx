import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview Month grid (shared between CalendarScreen + CalendarView)
 * Hot path: minimize allocations and rerenders for smooth scrolling.
 * @module components/calendar/MonthGrid
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MoodGradeSurface } from '../mood/MoodGradeSurface';
import { getMonthMatrix } from '../../utils';
import { useAppTheme, getCalendarTextLimits } from '../../theme';
import { getMonthRenderModel } from './monthModel';
import { perfProbe } from '../../perf';
import { Touchable } from '../../ui/Touchable';
const sharedStylesCache = new Map();
const fullGridStylesCache = new Map();
function getFullGridCellStyles(fg, accentBlue) {
    const cacheKey = `${fg.cell}|${fg.gap}|${fg.fontSize}|${fg.lineHeight}|${fg.dotSize}|${fg.dotMarginTop}|${fg.todayRingW}|${fg.dotPadTop}|${fg.dotPadBottom}|${accentBlue}`;
    const cached = fullGridStylesCache.get(cacheKey);
    if (cached)
        return cached;
    const next = Object.freeze({
        cellSizeStyle: Object.freeze({ width: fg.cell, height: fg.cell, marginVertical: 0 }),
        pillBaseStyle: Object.freeze({
            width: fg.cell,
            height: fg.cell,
            borderRadius: fg.cell / 2,
        }),
        dayTextSizeStyle: Object.freeze({ fontSize: fg.fontSize, lineHeight: fg.lineHeight, marginTop: 0 }),
        dotBaseStyle: Object.freeze({
            width: fg.dotSize,
            height: fg.dotSize,
            borderRadius: fg.dotSize / 2,
            marginTop: fg.dotMarginTop,
        }),
        todayRingStyle: Object.freeze({ borderWidth: fg.todayRingW, borderColor: accentBlue }),
        pillFullGridDotLayout: Object.freeze({
            justifyContent: 'flex-start',
            paddingTop: fg.dotPadTop,
            paddingBottom: fg.dotPadBottom,
        }),
    });
    fullGridStylesCache.set(cacheKey, next);
    return next;
}
function getSharedStyles(sizeKey, accentBlue) {
    const cacheKey = `7|${sizeKey}|${accentBlue}`;
    const cached = sharedStylesCache.get(cacheKey);
    if (cached)
        return cached;
    const sizes = sizeKey === 'full'
        ? {
            cellH: 44,
            cellW: 44,
            vMargin: 4,
            dayFontSize: 16,
            dayLineHeight: 21,
            dotSize: 2,
            dotMarginTop: 1,
            textTopNudge: 0,
            todayRingW: 2,
        }
        : sizeKey === 'mini-fill'
            ? {
                cellH: 14,
                cellW: 14,
                vMargin: 1,
                dayFontSize: 6,
                dayLineHeight: 8,
                dotSize: 3,
                dotMarginTop: 1,
                textTopNudge: 0,
                todayRingW: 1,
            }
            : {
                cellH: 14,
                cellW: 14,
                vMargin: 1,
                dayFontSize: 8,
                dayLineHeight: 9,
                dotSize: 3,
                dotMarginTop: 1,
                textTopNudge: 0,
                todayRingW: 1,
            };
    const next = Object.freeze({
        cellSizeStyle: Object.freeze({
            width: sizes.cellW,
            height: sizes.cellH,
            marginVertical: sizes.vMargin,
        }),
        pillBaseStyle: Object.freeze({
            width: sizes.cellW,
            height: sizes.cellH,
            borderRadius: sizes.cellH / 2,
        }),
        todayRingStyle: Object.freeze({
            borderWidth: sizes.todayRingW,
            borderColor: accentBlue,
        }),
        dayTextSizeStyle: Object.freeze({
            fontSize: sizes.dayFontSize,
            lineHeight: sizes.dayLineHeight,
            marginTop: sizes.textTopNudge,
        }),
        dotBaseStyle: Object.freeze({
            width: sizes.dotSize,
            height: sizes.dotSize,
            borderRadius: sizes.dotSize / 2,
            marginTop: sizes.dotMarginTop,
        }),
    });
    sharedStylesCache.set(cacheKey, next);
    return next;
}
const bgColorStyleCache = new Map();
function bgStyle(color) {
    const cached = bgColorStyleCache.get(color);
    if (cached)
        return cached;
    const next = Object.freeze({ backgroundColor: color });
    bgColorStyleCache.set(color, next);
    return next;
}
const DayCell = React.memo(function DayCell(props) {
    const { day, moodColor, moodGrade, moodGradeColorStyle, isDark, isFill, isSelected, isToday, forceBold, sizeKey, variant, reduceMotion, onPress, a11yLabel, accentBlue, onBgLabelColor, dayMaxFontMult, fullGridLayout, } = props;
    const isBold = isFill || forceBold;
    const fgStyles = variant === 'full' && fullGridLayout ? getFullGridCellStyles(fullGridLayout, accentBlue) : null;
    const shared = fgStyles ? null : getSharedStyles(sizeKey, accentBlue);
    const cellSizeStyle = fgStyles ? fgStyles.cellSizeStyle : shared.cellSizeStyle;
    const pillBaseStyle = fgStyles ? fgStyles.pillBaseStyle : shared.pillBaseStyle;
    const dayTextSizeStyle = fgStyles ? fgStyles.dayTextSizeStyle : shared.dayTextSizeStyle;
    const dotBaseStyle = fgStyles ? fgStyles.dotBaseStyle : shared.dotBaseStyle;
    const todayRingStyle = fgStyles ? fgStyles.todayRingStyle : shared.todayRingStyle;
    if (perfProbe.enabled) {
        if (day === 1)
            perfProbe.breadcrumb(variant === 'mini' ? 'DayCell.render.mini' : 'DayCell.render.full');
    }
    const selectionRing = isSelected ? { borderWidth: 2, borderColor: accentBlue } : null;
    /** Fill theme: “today” ring on the whole mood disk. Dot theme: ring only on the mood dot (see below). */
    const todayRingOnOuterPill = isToday && !isSelected && isFill;
    const showTodayDotRing = isToday && !isSelected && !isFill;
    const ringW = todayRingStyle.borderWidth;
    const todayDotInset = Math.max(1, Math.round(ringW * 0.65));
    const dotBoxStyle = {
        width: dotBaseStyle.width,
        height: dotBaseStyle.height,
        borderRadius: dotBaseStyle.borderRadius,
    };
    const dotRowMarginTop = typeof dotBaseStyle.marginTop === 'number' ? dotBaseStyle.marginTop : 0;
    const showGradientFill = isFill && moodGradeColorStyle === 'gradient' && !!moodGrade;
    const showSolidFill = isFill && moodGradeColorStyle === 'solid' && !!moodColor;
    const pillRadius = pillBaseStyle.borderRadius;
    const moodDot = moodGrade ? (_jsx(MoodGradeSurface, { grade: moodGrade, moodGradeColorStyle: moodGradeColorStyle, isDark: isDark, variant: "opaque", style: dotBoxStyle })) : null;
    const pillFullGridDotLayout = variant === 'full' && !isFill
        ? fgStyles
            ? fgStyles.pillFullGridDotLayout
            : styles.pillFullDotMode
        : null;
    const content = (_jsxs(View, { style: [
            styles.pill,
            pillFullGridDotLayout,
            pillBaseStyle,
            showSolidFill && moodColor ? bgStyle(moodColor) : null,
            showGradientFill ? { backgroundColor: 'transparent' } : null,
            selectionRing,
            todayRingOnOuterPill ? todayRingStyle : null,
        ], children: [showGradientFill && moodGrade ? (_jsx(MoodGradeSurface, { grade: moodGrade, moodGradeColorStyle: moodGradeColorStyle, isDark: isDark, variant: "opaque", style: [StyleSheet.absoluteFillObject, { borderRadius: pillRadius }] })) : null, _jsx(Text, { style: [
                    styles.dayText,
                    dayTextSizeStyle,
                    isFill ? styles.dayTextOnFill : { color: onBgLabelColor },
                    isBold ? styles.dayTextBold : styles.dayTextRegular,
                    variant === 'full' && Platform.OS === 'android' ? styles.dayTextAndroidAlign : null,
                    showGradientFill || showSolidFill ? styles.dayTextOverFill : null,
                ], allowFontScaling: variant === 'full', maxFontSizeMultiplier: variant === 'full' ? dayMaxFontMult : 1, numberOfLines: variant === 'full' ? 1 : undefined, children: day }), !isFill ? (moodColor && moodGrade ? (showTodayDotRing ? (_jsx(View, { style: [
                    styles.todayMoodDotRing,
                    {
                        marginTop: dotRowMarginTop,
                        borderWidth: ringW,
                        borderColor: accentBlue,
                        padding: todayDotInset,
                    },
                ], children: moodDot })) : (_jsx(View, { style: [dotBaseStyle, { backgroundColor: 'transparent' }], children: moodDot }))) : showTodayDotRing ? (_jsx(View, { style: [
                    dotBoxStyle,
                    {
                        marginTop: dotRowMarginTop,
                        borderWidth: ringW,
                        borderColor: accentBlue,
                        backgroundColor: 'transparent',
                    },
                ] })) : null) : null] }));
    if (!onPress) {
        return _jsx(View, { style: [styles.cell, cellSizeStyle], children: content });
    }
    return (_jsx(Touchable, { onPress: onPress, accessibilityRole: "button", accessibilityLabel: a11yLabel, accessibilityHint: "Opens mood entry editor", accessibilityState: { selected: isSelected }, scaleTo: reduceMotion ? 1 : 0.99, hitSlop: variant === 'full' ? { top: 2, bottom: 2, left: 2, right: 2 } : undefined, style: ({ pressed }) => [
            styles.cell,
            cellSizeStyle,
            pressed ? styles.pressedOpacity : null,
        ], children: content }));
}, (prev, next) => prev.day === next.day &&
    prev.moodColor === next.moodColor &&
    prev.moodGrade === next.moodGrade &&
    prev.moodGradeColorStyle === next.moodGradeColorStyle &&
    prev.isDark === next.isDark &&
    prev.isFill === next.isFill &&
    prev.isSelected === next.isSelected &&
    prev.isToday === next.isToday &&
    prev.forceBold === next.forceBold &&
    prev.sizeKey === next.sizeKey &&
    prev.variant === next.variant &&
    prev.reduceMotion === next.reduceMotion &&
    prev.onPress === next.onPress &&
    prev.a11yLabel === next.a11yLabel &&
    prev.accentBlue === next.accentBlue &&
    prev.onBgLabelColor === next.onBgLabelColor &&
    prev.dayMaxFontMult === next.dayMaxFontMult &&
    prev.fullGridLayout?.cell === next.fullGridLayout?.cell &&
    prev.fullGridLayout?.gap === next.fullGridLayout?.gap);
export const MonthGrid = React.memo(function MonthGrid({ year, monthIndex0, variant, entries, calendarMoodStyle, entriesRevision = 0, todayKey, selectedDate, onPressDate, reduceMotion = false, onHapticSelect, fullGridLayout, moodGradeColorStyle, isDark, recycleGuardEpoch = 0, }) {
    const { system, fontScale, windowWidth } = useAppTheme();
    const textLimits = useMemo(() => getCalendarTextLimits(fontScale, windowWidth), [fontScale, windowWidth]);
    if (perfProbe.enabled) {
        perfProbe.breadcrumb(variant === 'mini' ? 'MonthGrid.render.mini' : 'MonthGrid.render.full');
    }
    const weeks = useMemo(() => getMonthMatrix(year, monthIndex0), [year, monthIndex0]);
    const todayIso = useMemo(() => {
        if (typeof todayKey === 'string' && todayKey.length === 10)
            return todayKey;
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mm}-${dd}`;
    }, [todayKey]);
    useEffect(() => {
        if (!perfProbe.enabled)
            return;
        if (variant === 'mini' && monthIndex0 !== 0)
            return;
        perfProbe.breadcrumb(variant === 'mini' ? 'MonthGrid.commit.mini' : 'MonthGrid.commit.full');
    }, [monthIndex0, variant]);
    const model = useMemo(() => {
        void recycleGuardEpoch;
        return getMonthRenderModel({
            year,
            monthIndex0,
            variant,
            calendarMoodStyle,
            monthEntries: entries,
            entriesRevision,
            selectedDate,
            todayIso,
            onPressDate,
            onHapticSelect,
        });
    }, [
        year,
        monthIndex0,
        variant,
        calendarMoodStyle,
        entries,
        entriesRevision,
        selectedDate,
        todayIso,
        onPressDate,
        onHapticSelect,
        recycleGuardEpoch,
    ]);
    const forceBoldMiniWhenFillTheme = variant === 'mini' && calendarMoodStyle === 'fill';
    const shared = getSharedStyles(model.sizeKey, system.blue);
    const emptyCellStyle = shared.cellSizeStyle;
    const dayMult = variant === 'full' ? textLimits.monthGridDayFull : 1;
    const useUniformFull = variant === 'full' && fullGridLayout != null;
    const gridCombined = useUniformFull ? [styles.grid, { rowGap: fullGridLayout.gap }] : styles.grid;
    const rowCombined = useUniformFull ? [styles.rowUniform, { columnGap: fullGridLayout.gap }] : styles.row;
    const emptyCellActual = useUniformFull
        ? { width: fullGridLayout.cell, height: fullGridLayout.cell }
        : emptyCellStyle;
    return (_jsx(View, { style: gridCombined, accessibilityRole: variant === 'full' ? 'none' : undefined, children: weeks.map((week, wIdx) => (_jsx(View, { style: rowCombined, children: week.map((day, dIdx) => {
                if (!day) {
                    return (_jsx(View, { style: emptyCellActual }, `e-${year}-${monthIndex0}-${wIdx}-${dIdx}`));
                }
                const moodColor = model.moodColorByDay[day] ?? null;
                const moodGrade = model.moodGradeByDay[day] ?? null;
                const isFill = model.isFillTheme && !!moodColor;
                const isSelected = model.selectedDay === day;
                const isToday = model.todayDay === day;
                const a11yLabel = model.pressByDay ? (model.a11yLabelByDay[day] ?? '') : '';
                return (_jsx(DayCell, { day: day, moodColor: moodColor, moodGrade: moodGrade, moodGradeColorStyle: moodGradeColorStyle, isDark: isDark, isFill: isFill, isSelected: isSelected, isToday: isToday, forceBold: forceBoldMiniWhenFillTheme, sizeKey: model.sizeKey, variant: variant, reduceMotion: reduceMotion, onPress: model.pressByDay ? model.pressByDay[day] : undefined, a11yLabel: a11yLabel, accentBlue: system.blue, onBgLabelColor: system.label, dayMaxFontMult: dayMult, fullGridLayout: variant === 'full' ? fullGridLayout : null }, `c-${year}-${monthIndex0}-${wIdx}-${dIdx}`));
            }) }, `w-${year}-${monthIndex0}-${wIdx}`))) }));
});
const styles = StyleSheet.create({
    grid: { width: '100%' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    rowUniform: { flexDirection: 'row', justifyContent: 'flex-start', width: '100%' },
    cell: { alignItems: 'center', justifyContent: 'center' },
    pressedOpacity: { opacity: 0.85 },
    pill: {
        position: 'relative',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    /** Keeps day numerals above bloom fill layers (gradient mode). */
    dayTextOverFill: { zIndex: 1 },
    /** Dot theme on full grid only — model uses fill theme for full pills (centered label). */
    pillFullDotMode: {
        justifyContent: 'flex-start',
        paddingTop: 8,
        paddingBottom: 9,
    },
    dayText: { textAlign: 'center' },
    /** Android: extra font padding skews “today” rings vs the glyph. */
    dayTextAndroidAlign: {
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    /** Blue ring sits on the mood dot only (dot theme “today”). */
    todayMoodDotRing: {
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
    },
    dayTextOnFill: { color: '#fff' },
    dayTextBold: { fontWeight: '700' },
    dayTextRegular: { fontWeight: '400' },
});
