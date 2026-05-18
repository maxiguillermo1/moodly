/**
 * @fileoverview Native-feel pressable wrapper (no visual redesign).
 *
 * Features:
 * - Subtle scale feedback (UI-thread via Reanimated).
 * - Cancels pressed feedback when scrolling/momentum begins.
 * - No ripple effects; no layout shift (transform only).
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import type { ViewStyle, StyleProp } from 'react-native';
import { Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

import { interactionQueue } from './interactionQueue';
import { DEFAULT_HIT_SLOP, getReduceMotionEnabled } from './accessibility';

type Props = React.ComponentProps<typeof Pressable> & {
  children: React.ReactNode;
  scaleTo?: number; // default ~0.985
  style?: React.ComponentProps<typeof Pressable>['style'] | StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Touchable(props: Props): React.ReactElement {
  const { scaleTo = 0.985, onPressIn, onPressOut, pressRetentionOffset, hitSlop, style, ...rest } = props;

  const scale = useSharedValue(1);

  const springConfig = useMemo(
    () => ({
      damping: 22,
      stiffness: 268,
      mass: 0.82,
    }),
    []
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  }, []);

  const cancelPressed = useCallback(() => {
    const reduceMotion = getReduceMotionEnabled();
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withTiming(1, { duration: 78 });
  }, [scale]);

  useEffect(() => {
    // Cancel pressed feedback when a scroll/momentum interaction begins.
    return interactionQueue.subscribe((s) => {
      if (s.isUserScrolling || s.isMomentum) cancelPressed();
    });
  }, [cancelPressed]);

  const handlePressIn = useCallback(
    (e: any) => {
      const reduceMotion = getReduceMotionEnabled();
      if (!reduceMotion) {
        scale.value = withTiming(scaleTo, { duration: 40 });
      }
      onPressIn?.(e);
    },
    [onPressIn, scale, scaleTo]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      const reduceMotion = getReduceMotionEnabled();
      if (!reduceMotion) {
        scale.value = withSpring(1, springConfig as any);
      }
      onPressOut?.(e);
    },
    [onPressOut, scale, springConfig]
  );

  const mergedStyle: any = useMemo(() => {
    // Pressable supports `style` as:
    // - object/array
    // - function ({ pressed }) => style
    if (typeof style === 'function') {
      return (s: any) => [style(s), animatedStyle];
    }
    return [style as any, animatedStyle as any];
  }, [animatedStyle, style]);

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      // Tuned to feel iOS-like; does not affect layout.
      pressRetentionOffset={pressRetentionOffset ?? { top: 20, left: 20, right: 20, bottom: 20 }}
      hitSlop={hitSlop ?? DEFAULT_HIT_SLOP}
      style={mergedStyle}
    />
  );
}

