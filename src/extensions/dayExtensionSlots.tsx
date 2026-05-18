/**
 * @fileoverview Memoized per-extension slots (isolated hooks; minimal shared parents).
 * @module extensions/dayExtensionSlots
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { spacing, typography, useAppTheme } from '../theme';
import { useExtensionsPolicy } from '../theme/ExtensionsPolicyContext';
import { useTodayHabitStripModel } from '../hooks';
import { HabitChipGroup } from '../components/habits/HabitChipGroup';
import { TodayGoalsExtension } from '../components/todayExtensions/TodayGoalsExtension';
import { TodayTodoExtension } from '../components/todayExtensions/TodayTodoExtension';

import { useDayScope } from './DayScopeContext';
import type { TodayExtensionsInsetVariant } from './types';

export type DayExtensionSlotProps = {
  insetVariant: TodayExtensionsInsetVariant;
};

function useSectionChrome(insetVariant: TodayExtensionsInsetVariant) {
  const { system: s } = useAppTheme();
  return useMemo(() => {
    const nested = insetVariant === 'nested';
    return StyleSheet.create({
      section: {
        paddingVertical: nested ? spacing[3] : spacing[4],
        paddingHorizontal: nested ? 0 : spacing[4],
      },
      sectionKicker: {
        ...typography.caption1,
        fontWeight: '600',
        color: s.secondaryLabel,
        letterSpacing: 0.48,
        textTransform: 'uppercase',
        marginBottom: spacing[2],
      },
    });
  }, [s, insetVariant]);
}

export const HabitsExtensionSlot = React.memo(function HabitsExtensionSlot({
  insetVariant,
}: DayExtensionSlotProps): React.ReactElement | null {
  const { dateKey } = useDayScope();
  const { bumpTodayExtensionStackOrder } = useExtensionsPolicy();
  const habits = useTodayHabitStripModel(dateKey);
  const styles = useSectionChrome(insetVariant);

  const prevShowStrip = useRef(habits.showStrip);
  useEffect(() => {
    if (habits.showStrip && !prevShowStrip.current) {
      void bumpTodayExtensionStackOrder('habits');
    }
    prevShowStrip.current = habits.showStrip;
  }, [habits.showStrip, bumpTodayExtensionStackOrder]);

  if (!habits.showStrip) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionKicker} allowFontScaling maxFontSizeMultiplier={1.28} accessibilityRole="header">
        Habits
      </Text>
      <HabitChipGroup
        variant="today"
        habits={habits.habitsVisible}
        selectedIds={habits.selected}
        onToggle={habits.onToggle}
        compactTop
      />
    </View>
  );
});

export const GoalsExtensionSlot = React.memo(function GoalsExtensionSlot({
  insetVariant,
}: DayExtensionSlotProps): React.ReactElement | null {
  const { dateKey } = useDayScope();
  const styles = useSectionChrome(insetVariant);
  return (
    <View style={styles.section}>
      <TodayGoalsExtension layout="stack" date={dateKey} />
    </View>
  );
});

export const TodoExtensionSlot = React.memo(function TodoExtensionSlot({
  insetVariant,
}: DayExtensionSlotProps): React.ReactElement | null {
  const { dateKey } = useDayScope();
  const styles = useSectionChrome(insetVariant);
  const nested = insetVariant === 'nested';
  return (
    <View style={[styles.section, nested ? { paddingVertical: spacing[2] } : null]}>
      <TodayTodoExtension layout="stack" date={dateKey} />
    </View>
  );
});
