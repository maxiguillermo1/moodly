/**
 * @fileoverview Shared iOS Calendar-style capsule button (source of truth: CalendarScreen).
 *
 * Visual regression checklist (manual):
 * - Height = `sizing.capsuleHeight` (36)
 * - Radius = `sizing.capsuleRadius` (18)
 * - Hairline border + glass fill (via `LiquidGlass`)
 * - Icon size = `sizing.iconSm` (20)
 * - Back capsule paddingHorizontal = 12, gap = 4
 * - Icon-only capsule paddingHorizontal = 10, minWidth = capsuleHeight
 *
 * Non-negotiable: screenshots should match before/after (resting state identical).
 */

import React, { useMemo } from 'react';
import type { Insets, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { LiquidGlass } from './LiquidGlass';
import { colors, sizing, typography } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type CapsuleButtonProps = {
  kind: 'icon' | 'back';
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
  hitSlop?: Insets;
  testID?: string;

  iconName: IconName;
  iconColor?: string;

  /**
   * Only used for `kind="back"`.
   * Keep this as a simple string to avoid layout drift.
   */
  label?: string;
  labelColor?: string;

  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function CapsuleButton(props: CapsuleButtonProps): React.ReactElement {
  const {
    kind,
    onPress,
    disabled,
    accessibilityLabel,
    accessibilityHint,
    hitSlop,
    testID,
    iconName,
    iconColor,
    label,
    labelColor,
    style,
    labelStyle,
  } = props;

  const resolvedHitSlop = hitSlop ?? { top: 10, left: 10, right: 10, bottom: 10 };
  const resolvedIconColor = iconColor ?? colors.system.label;
  const resolvedLabelColor = labelColor ?? colors.system.blue;

  const containerStyle = useMemo(() => {
    return [
      styles.base,
      kind === 'icon' ? styles.icon : styles.back,
      disabled ? styles.disabled : null,
      style,
    ];
  }, [disabled, kind, style]);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      hitSlop={resolvedHitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [containerStyle, pressed ? styles.pressedOpacity : null]}
    >
      <LiquidGlass style={StyleSheet.absoluteFill} radius={sizing.capsuleRadius} shadow={false}>
        {null}
      </LiquidGlass>

      <Ionicons name={iconName} size={sizing.iconSm} color={resolvedIconColor} />

      {kind === 'back' ? (
        <Text
          style={[styles.backLabel, { color: resolvedLabelColor }, labelStyle]}
          allowFontScaling
          numberOfLines={1}
        >
          {label ?? ''}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: sizing.capsuleHeight,
    borderRadius: sizing.capsuleRadius,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  icon: {
    minWidth: sizing.capsuleHeight,
    paddingHorizontal: 10,
  },
  back: {
    paddingHorizontal: 12,
    gap: 4,
  },
  backLabel: {
    ...(typography.subhead as any),
    fontWeight: '600',
  },
  pressedOpacity: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});

