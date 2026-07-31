import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview Pill-style habit tag (Today: transparent / filled by selection; catalog: catalog tint).
 * @module components/habits/HabitChip
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { borderRadius, typography, useAppTheme } from '../../theme';
import { Touchable } from '../../ui/Touchable';
export function HabitChip({ habit, variant, selected = false, toggleOnCount = 0, onPress, }) {
    const { isDark, system: s } = useAppTheme();
    const todayUnselectedBorder = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(60,60,67,0.14)';
    const catalogBg = isDark ? habit.catalogSurfaceDark : habit.catalogSurfaceLight;
    const catalogBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,60,67,0.08)';
    const labelColorToday = selected ? habit.activeFg : s.label;
    const iconColorToday = selected ? habit.activeFg : s.secondaryLabel;
    const labelCatalog = s.label;
    const iconCatalog = isDark ? s.secondaryLabel : s.label;
    const showCount = variant === 'today' && toggleOnCount > 0;
    const countLabel = `${toggleOnCount}×`;
    const row = (_jsx(View, { style: [
            styles.pill,
            variant === 'today'
                ? {
                    backgroundColor: selected ? habit.activeBg : 'transparent',
                    borderColor: selected ? habit.activeBg : todayUnselectedBorder,
                }
                : { backgroundColor: catalogBg, borderColor: catalogBorder },
        ], children: _jsxs(View, { style: styles.innerColumn, children: [_jsxs(View, { style: styles.innerRow, children: [_jsx(Ionicons, { name: habit.icon, size: 16, color: variant === 'today' ? iconColorToday : iconCatalog, style: styles.icon, accessibilityElementsHidden: true, importantForAccessibility: "no" }), _jsx(Text, { style: [
                                styles.label,
                                typography.subhead,
                                { color: variant === 'today' ? labelColorToday : labelCatalog },
                            ], allowFontScaling: true, maxFontSizeMultiplier: 1.34, numberOfLines: 1, children: habit.label })] }), showCount ? (_jsx(Text, { style: [styles.toggleCount, typography.caption2, { color: variant === 'today' ? iconColorToday : s.tertiaryLabel }], allowFontScaling: true, maxFontSizeMultiplier: 1.28, accessibilityElementsHidden: true, importantForAccessibility: "no", children: countLabel })) : null] }) }));
    if (variant === 'today' && onPress) {
        return (_jsx(Touchable, { onPress: onPress, accessibilityRole: "button", accessibilityState: { selected }, accessibilityLabel: `${habit.label}, ${selected ? 'completed today' : 'not completed today'}${toggleOnCount > 0 ? `, ${toggleOnCount}×` : ''}`, accessibilityHint: selected ? 'Marks this habit not done' : 'Marks this habit done', scaleTo: 0.97, children: row }));
    }
    return row;
}
const styles = StyleSheet.create({
    pill: {
        borderRadius: borderRadius.full,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        minHeight: 36,
        justifyContent: 'center',
    },
    innerColumn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        alignItems: 'stretch',
    },
    innerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 6,
    },
    label: {
        fontWeight: '500',
        flexShrink: 1,
    },
    toggleCount: {
        marginTop: 2,
        marginLeft: 22,
        opacity: 0.85,
        alignSelf: 'flex-start',
    },
});
