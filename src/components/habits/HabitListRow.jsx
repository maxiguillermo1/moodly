import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * @fileoverview Habits list row — icon, title, subtitle; iOS-sized Today switch; tap row for completion.
 * @module components/habits/HabitListRow
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Switch, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, typography, useAppTheme } from '../../theme';
import { Touchable } from '../../ui/Touchable';
/** Icon well width — keep in sync with {@link HabitListRowSeparator} inset. */
export const HABIT_LIST_ICON_WELL = 36;
export function HabitListRow({ habit, completed, onToggle, toggleOnTotal = 0, showOnToday }) {
    const { isDark, system: s } = useAppTheme();
    const iconWellBg = isDark ? habit.catalogSurfaceDark : habit.catalogSurfaceLight;
    const completionEnabled = showOnToday ? showOnToday.value : true;
    const switchTrack = { false: s.gray5, true: s.green };
    const switchIosBg = s.gray5;
    const switchThumb = Platform.OS === 'android' ? s.secondaryBackground : undefined;
    const styles = useMemo(() => StyleSheet.create({
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: spacing[2],
            paddingHorizontal: spacing[3],
            minHeight: 48,
        },
        iconWell: {
            width: HABIT_LIST_ICON_WELL,
            height: HABIT_LIST_ICON_WELL,
            borderRadius: HABIT_LIST_ICON_WELL / 2,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing[2],
        },
        textBlock: {
            flex: 1,
            minWidth: 0,
            paddingRight: spacing[2],
        },
        title: {
            ...typography.subhead,
            fontWeight: '600',
            color: s.label,
            letterSpacing: -0.2,
        },
        toggleCount: {
            ...typography.caption2,
            color: s.tertiaryLabel,
            marginTop: 2,
            letterSpacing: 0.02,
        },
        subtitle: {
            ...typography.caption1,
            color: s.secondaryLabel,
            marginTop: 1,
            lineHeight: 15,
        },
        trailing: {
            flexDirection: 'row',
            alignItems: 'center',
            flexShrink: 0,
        },
        /** iOS `Switch` ignores intrinsic resize — scale visually; trim layout slack. */
        switchCompactIos: {
            transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }],
            marginLeft: -4,
            marginRight: -2,
        },
    }), [s]);
    const rowBody = (_jsxs(_Fragment, { children: [_jsx(View, { style: [styles.iconWell, { backgroundColor: iconWellBg }], children: _jsx(Ionicons, { name: habit.icon, size: 18, color: habit.activeFg, accessibilityElementsHidden: true, importantForAccessibility: "no" }) }), _jsxs(View, { style: styles.textBlock, children: [_jsx(Text, { style: styles.title, allowFontScaling: true, numberOfLines: 2, maxFontSizeMultiplier: 1.3, children: habit.label }), toggleOnTotal > 0 ? (_jsx(Text, { style: styles.toggleCount, allowFontScaling: true, maxFontSizeMultiplier: 1.28, children: toggleOnTotal === 1 ? '1 day' : `${toggleOnTotal} days` })) : null, _jsx(Text, { style: styles.subtitle, allowFontScaling: true, numberOfLines: 2, maxFontSizeMultiplier: 1.32, children: habit.subtitle })] })] }));
    return (_jsxs(View, { style: styles.row, children: [_jsx(Touchable, { onPress: completionEnabled ? onToggle : undefined, disabled: !completionEnabled, accessibilityRole: "checkbox", accessibilityState: { checked: completed, disabled: !completionEnabled }, accessibilityLabel: `${habit.label} done today${toggleOnTotal > 0 ? `, marked on ${toggleOnTotal} ${toggleOnTotal === 1 ? 'day' : 'days'}` : ''}`, accessibilityHint: !completionEnabled ? 'Turn on Show on Today to log this habit for the day.' : undefined, scaleTo: 0.99, style: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, opacity: completionEnabled ? 1 : 0.55 }, children: rowBody }), showOnToday ? (_jsx(View, { style: styles.trailing, children: _jsx(Switch, { value: showOnToday.value, onValueChange: showOnToday.onValueChange, trackColor: switchTrack, ios_backgroundColor: switchIosBg, thumbColor: switchThumb, accessibilityLabel: `Show ${habit.label} on Today`, accessibilityHint: "Controls whether this habit appears in the Today habit strip", accessibilityState: { checked: showOnToday.value }, style: Platform.OS === 'ios' ? styles.switchCompactIos : { marginLeft: spacing[1] } }) })) : null] }));
}
export function HabitListRowSeparator() {
    const { system: s } = useAppTheme();
    return (_jsx(View, { style: {
            height: StyleSheet.hairlineWidth,
            backgroundColor: s.separator,
            marginLeft: spacing[3] + HABIT_LIST_ICON_WELL + spacing[2],
        } }));
}
