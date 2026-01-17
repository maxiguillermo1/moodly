/**
 * @fileoverview iOS "Liquid Glass" material wrapper (Expo Go safe)
 * @module components/ui/LiquidGlass
 *
 * Notes:
 * - Uses expo-blur if installed (via conditional require). If not installed,
 *   it falls back to a translucent fill so builds don't break.
 * - Designed for capsule controls (pills, floating nav) without changing layout.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, useColorScheme, ViewStyle } from 'react-native';
import { colors, sizing } from '../../theme';

// Conditional import so the app still typechecks/runs even if expo-blur is not installed.
// If the user installs expo-blur, BlurView will be used automatically.
let BlurViewAny: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  BlurViewAny = require('expo-blur')?.BlurView ?? null;
} catch {
  BlurViewAny = null;
}

export type LiquidGlassProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number; // blur intensity default
  tint?: 'light' | 'dark' | 'default';
  border?: boolean;
  shadow?: boolean;
  radius?: number; // defaults to sizing.capsuleRadius
};

export const LiquidGlass = React.memo(function LiquidGlass({
  children,
  style,
  intensity = 56,
  tint = 'default',
  border = true,
  shadow = true,
  radius = sizing.capsuleRadius,
}: LiquidGlassProps) {
  const scheme = useColorScheme();
  const resolvedTint: 'light' | 'dark' | 'default' =
    tint === 'default' ? (scheme === 'dark' ? 'dark' : 'light') : tint;

  const tokens = resolvedTint === 'dark' ? colors.glass.dark : colors.glass.light;

  const shadowStyle = useMemo<ViewStyle>(() => {
    if (!shadow) return {};
    return {
      shadowColor: tokens.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: resolvedTint === 'dark' ? 0.35 : 0.18,
      shadowRadius: 14,
      elevation: 10,
    };
  }, [shadow, tokens.shadow, resolvedTint]);

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      borderRadius: radius,
      overflow: 'hidden',
      ...(shadowStyle as any),
    }),
    [radius, shadowStyle]
  );

  const showBlur = !!BlurViewAny;

  return (
    <View pointerEvents="box-none" style={[containerStyle, style]}>
      {/* Blur layer (only if expo-blur is installed) */}
      {showBlur ? (
        <BlurViewAny
          tint={resolvedTint}
          intensity={intensity}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* Translucent fallback fill (also helps even when blur is subtle) */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: tokens.background }]}
      />

      {/* Remove gradient sheen: keep only a subtle top edge highlight */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.topEdge,
            { opacity: resolvedTint === 'dark' ? 0.14 : 0.22 },
          ]}
        />
        <View
          style={[
            styles.topBand,
            {
              backgroundColor: tokens.highlight,
              opacity: resolvedTint === 'dark' ? 0.04 : 0.06,
            },
          ]}
        />
      </View>

      {/* Hairline border */}
      {border ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: tokens.border,
            },
          ]}
        />
      ) : null}

      {/* Border "glow" (very subtle) */}
      {border ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              borderWidth: 1,
              borderColor: tokens.highlight,
              opacity: resolvedTint === 'dark' ? 0.06 : 0.10,
            },
          ]}
        />
      ) : null}

      {/* Content */}
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 1,
    right: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  topBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
  },
});

