import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Today-only habit chip strip — gated by Settings + tracked habits list.
 * @module components/habits/TodayHabitExtensions
 */
import React from 'react';
import { View } from 'react-native';
import { useTodayHabitStripModel } from '../../hooks';
import { HabitChipGroup } from './HabitChipGroup';
export function TodayHabitExtensions({ date, containerStyle, }) {
    const { showStrip, habitsVisible, selected, onToggle } = useTodayHabitStripModel(date);
    if (!showStrip) {
        return null;
    }
    return (_jsx(View, { style: containerStyle, children: _jsx(HabitChipGroup, { variant: "today", habits: habitsVisible, selectedIds: selected, onToggle: onToggle, compactTop: true }) }));
}
