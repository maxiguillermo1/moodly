/**
 * @fileoverview Habits list row — icon, title, subtitle; iOS-sized Today switch; tap row for completion.
 * @module components/habits/HabitListRow
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Switch, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { HabitDefinition } from '../../types';
import { spacing, typography, useAppTheme } from '../../theme';
import { Touchable } from '../../ui/Touchable';

/** Icon well width — keep in sync with {@link HabitListRowSeparator} inset. */
export const HABIT_LIST_ICON_WELL = 36;

export type HabitListRowProps = {
  habit: HabitDefinition;
  completed: boolean;
  onToggle: () => void;
  /** Lifetime distinct days this habit is marked on (derived from saved day selections). */
  toggleOnTotal?: number;
  /** When set, controls whether the habit appears on the Today extension strip. */
  showOnToday?: {
    value: boolean;
    onValueChange: (next: boolean) => void;
  };
};

export function HabitListRow({ habit, completed, onToggle, toggleOnTotal = 0, showOnToday }: HabitListRowProps): React.ReactElement {
  const { isDark, system: s } = useAppTheme();

  const iconWellBg = isDark ? habit.catalogSurfaceDark : habit.catalogSurfaceLight;
  const completionEnabled = showOnToday ? showOnToday.value : true;

  const switchTrack = { false: s.gray5, true: s.green } as const;
  const switchIosBg = s.gray5;
  const switchThumb = Platform.OS === 'android' ? s.secondaryBackground : undefined;

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
      }),
    [s]
  );

  const rowBody = (
    <>
      <View style={[styles.iconWell, { backgroundColor: iconWellBg }]}>
        <Ionicons
          name={habit.icon}
          size={18}
          color={habit.activeFg}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title} allowFontScaling numberOfLines={2} maxFontSizeMultiplier={1.3}>
          {habit.label}
        </Text>
        {toggleOnTotal > 0 ? (
          <Text style={styles.toggleCount} allowFontScaling maxFontSizeMultiplier={1.28}>
            {toggleOnTotal === 1 ? '1 day' : `${toggleOnTotal} days`}
          </Text>
        ) : null}
        <Text style={styles.subtitle} allowFontScaling numberOfLines={2} maxFontSizeMultiplier={1.32}>
          {habit.subtitle}
        </Text>
      </View>
    </>
  );

  return (
    <View style={styles.row}>
      <Touchable
        onPress={completionEnabled ? onToggle : undefined}
        disabled={!completionEnabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed, disabled: !completionEnabled }}
        accessibilityLabel={`${habit.label} done today${
          toggleOnTotal > 0 ? `, marked on ${toggleOnTotal} ${toggleOnTotal === 1 ? 'day' : 'days'}` : ''
        }`}
        accessibilityHint={
          !completionEnabled ? 'Turn on Show on Today to log this habit for the day.' : undefined
        }
        scaleTo={0.99}
        style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, opacity: completionEnabled ? 1 : 0.55 }}
      >
        {rowBody}
      </Touchable>
      {showOnToday ? (
        <View style={styles.trailing}>
          <Switch
            value={showOnToday.value}
            onValueChange={showOnToday.onValueChange}
            trackColor={switchTrack}
            ios_backgroundColor={switchIosBg}
            thumbColor={switchThumb}
            accessibilityLabel={`Show ${habit.label} on Today`}
            accessibilityHint="Controls whether this habit appears in the Today habit strip"
            accessibilityState={{ checked: showOnToday.value }}
            style={Platform.OS === 'ios' ? styles.switchCompactIos : { marginLeft: spacing[1] }}
          />
        </View>
      ) : null}
    </View>
  );
}

export function HabitListRowSeparator(): React.ReactElement {
  const { system: s } = useAppTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: s.separator,
        marginLeft: spacing[3] + HABIT_LIST_ICON_WELL + spacing[2],
      }}
    />
  );
}
