/**
 * @fileoverview Today-only habit chip strip — gated by Settings + tracked habits list.
 * @module components/habits/TodayHabitExtensions
 */

import React from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

import { useTodayHabitStripModel } from '../../hooks';
import { HabitChipGroup } from './HabitChipGroup';

export type TodayHabitExtensionsProps = {
  date: string;
  /** When the strip renders, wraps chips (e.g. Today gutter margins). */
  containerStyle?: StyleProp<ViewStyle>;
};

export function TodayHabitExtensions({
  date,
  containerStyle,
}: TodayHabitExtensionsProps): React.ReactElement | null {
  const { showStrip, habitsVisible, selected, onToggle } = useTodayHabitStripModel(date);

  if (!showStrip) {
    return null;
  }

  return (
    <View style={containerStyle}>
      <HabitChipGroup
        variant="today"
        habits={habitsVisible}
        selectedIds={selected}
        onToggle={onToggle}
        compactTop
      />
    </View>
  );
}
