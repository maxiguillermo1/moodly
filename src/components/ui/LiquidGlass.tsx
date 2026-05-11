/**
 * @fileoverview iOS "Liquid Glass" material wrapper (Expo Go safe)
 * @module components/ui/LiquidGlass
 *
 * Respects Reduce Transparency (via AppTheme) and active light/dark interface style.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useAppTheme, sizing } from '../../theme';

let BlurViewAny: any = null;
try {
  BlurViewAny = require('expo-blur')?.BlurView ?? null;
} catch {
  BlurViewAny = null;
}

export type LiquidGlassProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  border?: boolean;
  shadow?: boolean;
  radius?: number;
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
  const { isDark, glass, a11y } = useAppTheme();

  const resolvedTint: 'light' | 'dark' =
    tint === 'default' ? (isDark ? 'dark' : 'light') : tint;

  const tokens = glass;

  const blurIntensity = useMemo(() => {
    if (a11y.reduceTransparency) return 0;
    const base = intensity;
    return isDark ? Math.round(base * 0.92) : base;
  }, [a11y.reduceTransparency, intensity, isDark]);

  const fillOpacityBoost = a11y.reduceTransparency ? 0.14 : 0;

  const shadowStyle = useMemo<ViewStyle>(() => {
    if (!shadow) return {};
    const elevated = isDark && !a11y.reduceTransparency;
    return {
      shadowColor: tokens.shadow,
      shadowOffset: { width: 0, height: elevated ? 10 : 7 },
      shadowOpacity: elevated ? 0.48 : 0.2,
      shadowRadius: elevated ? 18 : 15,
      elevation: elevated ? 14 : 11,
    };
  }, [shadow, tokens.shadow, isDark, a11y.reduceTransparency]);

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      borderRadius: radius,
      overflow: 'hidden',
      ...(shadowStyle as any),
    }),
    [radius, shadowStyle]
  );

  const showBlur = !!BlurViewAny && !a11y.reduceTransparency && blurIntensity > 0;

  const fillBackground = useMemo(() => {
    const m = tokens.background.match(/rgba?\(([^)]+)\)/);
    if (!m) return tokens.background;
    const parts = m[1].split(',').map((s: string) => s.trim());
    if (parts.length === 4) {
      const a = Math.min(1, parseFloat(parts[3]) + fillOpacityBoost);
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
    }
    return tokens.background;
  }, [fillOpacityBoost, tokens.background]);

  return (
    <View pointerEvents="box-none" style={[containerStyle, style]}>
      {showBlur ? (
        <BlurViewAny tint={resolvedTint} intensity={blurIntensity} style={StyleSheet.absoluteFill} />
      ) : null}

      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fillBackground }]} />

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.topEdge,
            { opacity: resolvedTint === 'dark' ? 0.12 : 0.22 },
          ]}
        />
        <View
          style={[
            styles.topBand,
            {
              backgroundColor: tokens.highlight,
              opacity: resolvedTint === 'dark' ? 0.035 : 0.065,
            },
          ]}
        />
      </View>

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

      {border ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              borderWidth: 1,
              borderColor: tokens.highlight,
              opacity: resolvedTint === 'dark' ? 0.055 : 0.1,
            },
          ]}
        />
      ) : null}

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
    height: 14,
  },
});
