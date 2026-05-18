/**
 * @fileoverview Wrapping row of habit chips (Today + Habits catalog).
 * @module components/habits/HabitChipGroup
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { HABIT_CATALOG, type HabitId } from '../../utils';
import type { HabitDefinition } from '../../types';
import { spacing } from '../../theme';
import { HabitChip, type HabitChipVariant } from './HabitChip';

export type HabitChipGroupProps = {
  variant: HabitChipVariant;
  selectedIds: ReadonlySet<HabitId>;
  /** Optional: times toggled on (e.g. catalog); Today extension omits this so counts stay Habits-only. */
  toggleOnCounts?: ReadonlyMap<HabitId, number>;
  onToggle?: (id: HabitId) => void;
  /** Subset of catalog to render (Today strip). Defaults to full catalog. */
  habits?: readonly HabitDefinition[];
  /** Today: chips sit directly under the mood card with no section header — skip extra top inset. */
  compactTop?: boolean;
};

export function HabitChipGroup({
  variant,
  selectedIds,
  toggleOnCounts,
  onToggle,
  habits,
  compactTop = false,
}: HabitChipGroupProps): React.ReactElement {
  const list = habits ?? HABIT_CATALOG;
  const wrapStyle = useMemo(
    () => ({
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      marginHorizontal: -spacing[1],
      marginTop: compactTop ? 0 : spacing[2],
    }),
    [compactTop]
  );

  return (
    <View style={wrapStyle}>
      {list.map((h) => (
        <View key={h.id} style={styles.cell} accessibilityRole="none">
          <HabitChip
            habit={h}
            variant={variant}
            selected={selectedIds.has(h.id)}
            toggleOnCount={toggleOnCounts?.get(h.id) ?? 0}
            onPress={onToggle ? () => onToggle(h.id) : undefined}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    padding: spacing[1],
    maxWidth: '100%',
  },
});
