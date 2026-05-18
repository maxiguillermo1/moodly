/**
 * @fileoverview Pill-style habit tag (Today: transparent / filled by selection; catalog: catalog tint).
 * @module components/habits/HabitChip
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { HabitDefinition } from '../../types';
import { borderRadius, typography, useAppTheme } from '../../theme';
import { Touchable } from '../../ui/Touchable';

export type HabitChipVariant = 'today' | 'catalog';

export type HabitChipProps = {
  habit: HabitDefinition;
  variant: HabitChipVariant;
  /** Today interactive selection */
  selected?: boolean;
  /** Times toggled on (off→on); subtle label when &gt; 0 (catalog / non-extension use). */
  toggleOnCount?: number;
  onPress?: () => void;
};

export function HabitChip({
  habit,
  variant,
  selected = false,
  toggleOnCount = 0,
  onPress,
}: HabitChipProps): React.ReactElement {
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

  const row = (
    <View
      style={[
        styles.pill,
        variant === 'today'
          ? {
              backgroundColor: selected ? habit.activeBg : 'transparent',
              borderColor: selected ? habit.activeBg : todayUnselectedBorder,
            }
          : { backgroundColor: catalogBg, borderColor: catalogBorder },
      ]}
    >
      <View style={styles.innerColumn}>
        <View style={styles.innerRow}>
          <Ionicons
            name={habit.icon}
            size={16}
            color={variant === 'today' ? iconColorToday : iconCatalog}
            style={styles.icon}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text
            style={[
              styles.label,
              typography.subhead,
              { color: variant === 'today' ? labelColorToday : labelCatalog },
            ]}
            allowFontScaling
            maxFontSizeMultiplier={1.34}
            numberOfLines={1}
          >
            {habit.label}
          </Text>
        </View>
        {showCount ? (
          <Text
            style={[styles.toggleCount, typography.caption2, { color: variant === 'today' ? iconColorToday : s.tertiaryLabel }]}
            allowFontScaling
            maxFontSizeMultiplier={1.28}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {countLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (variant === 'today' && onPress) {
    return (
      <Touchable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${habit.label}, ${selected ? 'completed today' : 'not completed today'}${
          toggleOnCount > 0 ? `, ${toggleOnCount}×` : ''
        }`}
        accessibilityHint={selected ? 'Marks this habit not done' : 'Marks this habit done'}
        scaleTo={0.97}
      >
        {row}
      </Touchable>
    );
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
