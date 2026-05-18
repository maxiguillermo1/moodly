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
  /**
   * Heavier material: stacked blur, milkier frost, brighter edge, deeper shadow (e.g. floating tab bar).
   */
  prominent?: boolean;
};

export const LiquidGlass = React.memo(function LiquidGlass({
  children,
  style,
  intensity = 56,
  tint = 'default',
  border = true,
  shadow = true,
  radius = sizing.capsuleRadius,
  prominent = false,
}: LiquidGlassProps) {
  const { isDark, glass, a11y } = useAppTheme();

  const resolvedTint: 'light' | 'dark' =
    tint === 'default' ? (isDark ? 'dark' : 'light') : tint;

  const tokens = glass;

  const blurIntensity = useMemo(() => {
    if (a11y.reduceTransparency) return 0;
    let v = Math.min(100, intensity);
    if (!prominent && isDark) v = Math.round(v * 0.92);
    return Math.min(100, v);
  }, [a11y.reduceTransparency, intensity, isDark, prominent]);

  const secondaryBlurIntensity = useMemo(() => {
    if (!prominent || isDark || a11y.reduceTransparency || blurIntensity <= 0) return 0;
    return Math.min(100, Math.round(blurIntensity * 0.5));
  }, [a11y.reduceTransparency, prominent, isDark, blurIntensity]);

  const fillOpacityBoost = a11y.reduceTransparency ? 0.14 : 0;

  const shadowStyle = useMemo<ViewStyle>(() => {
    if (!shadow) return {};
    const elevated = isDark && !a11y.reduceTransparency;
    if (prominent) {
      return {
        shadowColor: tokens.shadow,
        shadowOffset: { width: 0, height: elevated ? 14 : 11 },
        shadowOpacity: elevated ? 0.58 : 0.4,
        shadowRadius: elevated ? 28 : 24,
        elevation: elevated ? 20 : 18,
      };
    }
    return {
      shadowColor: tokens.shadow,
      shadowOffset: { width: 0, height: elevated ? 10 : 7 },
      shadowOpacity: elevated ? 0.48 : 0.2,
      shadowRadius: elevated ? 18 : 15,
      elevation: elevated ? 14 : 11,
    };
  }, [shadow, tokens.shadow, isDark, a11y.reduceTransparency, prominent]);

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
      const frostExtra = prominent ? (isDark ? 0.07 : 0.18) : 0;
      const cap = prominent ? (isDark ? 0.78 : 0.92) : 1;
      const a = Math.min(cap, parseFloat(parts[3]) + fillOpacityBoost + frostExtra);
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
    }
    return tokens.background;
  }, [fillOpacityBoost, tokens.background, prominent, isDark]);

  const topEdgeOpacity =
    resolvedTint === 'dark' ? (prominent ? 0 : 0.12) : prominent ? 0.55 : 0.22;
  const topBandOpacity =
    resolvedTint === 'dark' ? (prominent ? 0 : 0.035) : prominent ? 0.16 : 0.065;
  const topBandHeight =
    resolvedTint === 'dark' ? (prominent ? 0 : 14) : prominent ? 20 : 14;
  const innerRimOpacity = prominent
    ? resolvedTint === 'dark'
      ? 0.08
      : 0.28
    : resolvedTint === 'dark'
      ? 0.055
      : 0.1;

  return (
    <View pointerEvents="box-none" style={[containerStyle, style]}>
      {showBlur ? (
        <>
          <BlurViewAny tint={resolvedTint} intensity={blurIntensity} style={StyleSheet.absoluteFill} />
          {secondaryBlurIntensity > 0 ? (
            <BlurViewAny
              tint={resolvedTint}
              intensity={secondaryBlurIntensity}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </>
      ) : null}

      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fillBackground }]} />

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {topEdgeOpacity > 0 ? (
          <View
            style={[
              styles.topEdge,
              { opacity: topEdgeOpacity },
            ]}
          />
        ) : null}
        {topBandHeight > 0 && topBandOpacity > 0 ? (
          <View
            style={[
              styles.topBand,
              {
                height: topBandHeight,
                backgroundColor: tokens.highlight,
                opacity: topBandOpacity,
              },
            ]}
          />
        ) : null}
      </View>

      {border ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              borderWidth: prominent ? 1 : StyleSheet.hairlineWidth,
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
              opacity: innerRimOpacity,
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
