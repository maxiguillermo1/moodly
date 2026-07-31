import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Wrapping row of habit chips (Today + Habits catalog).
 * @module components/habits/HabitChipGroup
 */
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { HABIT_CATALOG } from '../../utils';
import { spacing } from '../../theme';
import { HabitChip } from './HabitChip';
export function HabitChipGroup({ variant, selectedIds, toggleOnCounts, onToggle, habits, compactTop = false, }) {
    const list = habits ?? HABIT_CATALOG;
    const wrapStyle = useMemo(() => ({
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -spacing[1],
        marginTop: compactTop ? 0 : spacing[2],
    }), [compactTop]);
    return (_jsx(View, { style: wrapStyle, children: list.map((h) => (_jsx(View, { style: styles.cell, accessibilityRole: "none", children: _jsx(HabitChip, { habit: h, variant: variant, selected: selectedIds.has(h.id), toggleOnCount: toggleOnCounts?.get(h.id) ?? 0, onPress: onToggle ? () => onToggle(h.id) : undefined }) }, h.id))) }));
}
const styles = StyleSheet.create({
    cell: {
        padding: spacing[1],
        maxWidth: '100%',
    },
});
