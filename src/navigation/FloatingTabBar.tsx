/**
 * @fileoverview Floating bottom tab bar — liquid-glass pill (v3 rewrite).
 * @module navigation/FloatingTabBar
 *
 * Design: centered glass shell, gray selection stadium, icon + label tabs,
 * pink bloom on scroll/keyboard motion, auto-hide on scroll.
 *
 * Architecture (intentionally minimal):
 * - React Navigation `state.index` is the only selected-tab truth.
 * - Tab presses use the same dispatch pattern as the default BottomTabBar.
 * - Plain RN Pressable for taps (Reanimated pressables were dropping touches on iOS).
 * - Pill position follows `state.index` only (no inferring tab from pill geometry).
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Keyboard,
  Text,
  type LayoutChangeEvent,
} from 'react-native';
import { PlatformPressable } from '@react-navigation/elements';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BottomTabBarHeightCallbackContext } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, sizing, borderRadius, typography, useAppTheme } from '../theme';
import { LiquidGlass } from '../components';
import { useTabBarAutoHideOptional } from './TabBarAutoHideContext';
import { recordNavDispatch, recordTabPress } from '../perf/navigationMetrics';
import { haptics } from '../system/haptics';
import {
  computeAllTabSelectionLayouts,
  TAB_SELECTION_SYM_W,
} from './tabBarSelectionLayout';

const OUTER_WIDTH_RATIO = 0.54;
const OUTER_PAD_V = 6;
const OUTER_PAD_H = 6;

const ICON_SIZE = 18;
const PILL_W = TAB_SELECTION_SYM_W;
const TAB_LABEL_GAP = 3;
const TAB_LABEL_LINE_H = Math.ceil(Number(typography.caption2.lineHeight ?? 12));
const TAB_STACK_H = ICON_SIZE + TAB_LABEL_GAP + TAB_LABEL_LINE_H;
const TAB_ROW_MIN_H = Math.max(sizing.minTouchTarget, TAB_STACK_H + 12);
const SELECTION_H = TAB_ROW_MIN_H;
const SELECTION_STADIUM_R = SELECTION_H / 2;
const MIN_STADIUM_W = SELECTION_H;

const TAB_ICONS_OUTLINE: Record<string, keyof typeof Ionicons.glyphMap> = {
  Calendar: 'calendar-outline',
  Today: 'sunny-outline',
  Journal: 'book-outline',
};

const TAB_ICONS_FILLED: Record<string, keyof typeof Ionicons.glyphMap> = {
  Calendar: 'calendar',
  Today: 'sunny',
  Journal: 'book',
};

const TAB_LABELS: Record<string, string> = {
  Calendar: 'Calendar',
  Today: 'Today',
  Journal: 'Journal',
};

const PILL_SPRING = {
  stiffness: 520,
  damping: 38,
  mass: 0.55,
  overshootClamping: true,
  restDisplacementThreshold: 0.25,
  restSpeedThreshold: 0.25,
} as const;

const PILL_SPRING_WIDTH = {
  stiffness: 440,
  damping: 34,
  mass: 0.55,
  overshootClamping: true,
  restDisplacementThreshold: 0.3,
  restSpeedThreshold: 0.3,
} as const;

type TabCellProps = {
  routeName: string;
  isFocused: boolean;
  inactiveColor: string;
  activeColor: string;
  onPress: () => void;
  onLongPress: () => void;
};

const TabCell = React.memo(function TabCell({
  routeName,
  isFocused,
  inactiveColor,
  activeColor,
  onPress,
  onLongPress,
}: TabCellProps) {
  const iconFilledName = TAB_ICONS_FILLED[routeName] ?? TAB_ICONS_FILLED.Today;
  const iconOutlineName = TAB_ICONS_OUTLINE[routeName] ?? TAB_ICONS_OUTLINE.Today;
  const label = TAB_LABELS[routeName] ?? routeName;

  return (
    <PlatformPressable
      accessibilityRole="tab"
      accessibilityLabel={`${label} tab`}
      accessibilityHint={isFocused ? 'Current tab' : `Switches to ${label}`}
      accessibilityState={{ selected: isFocused }}
      onPress={onPress}
      onLongPress={onLongPress}
      pressOpacity={0.72}
      style={styles.tabCellPressable}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <View style={styles.tabCellInner} pointerEvents="none">
        <Ionicons
          name={isFocused ? iconFilledName : iconOutlineName}
          size={ICON_SIZE}
          color={isFocused ? activeColor : inactiveColor}
          style={isFocused ? styles.tabIconFocused : styles.tabIconInactive}
        />
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? activeColor : inactiveColor,
              fontWeight: isFocused ? '700' : '500',
            },
          ]}
          allowFontScaling
          maxFontSizeMultiplier={1.22}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </PlatformPressable>
  );
});

function FloatingTabBarInner({ state, navigation, descriptors, insets }: BottomTabBarProps) {
  const { system: sys, a11y, windowWidth, isDark } = useAppTheme();
  const tabBarAutoHide = useTabBarAutoHideOptional();
  const onTabBarHeightChange = React.useContext(BottomTabBarHeightCallbackContext);
  const [touchEnabled, setTouchEnabled] = useState(true);

  const scrollHiddenProgress = tabBarAutoHide?.tabBarHiddenProgress ?? null;
  const keyboardHiddenProgress = useSharedValue(0);

  const focusedRoute = state.routes[state.index];
  const tabBarHideOnKeyboard = descriptors[focusedRoute?.key]?.options.tabBarHideOnKeyboard ?? true;

  const inactiveColor = sys.secondaryLabel;
  const activeColor = isDark ? 'rgba(255, 255, 255, 0.96)' : sys.label;

  const trackBloomGradient = useMemo(() => {
    if (isDark) {
      return {
        colors: ['rgba(255, 183, 229, 0.14)', 'rgba(255, 140, 200, 0.08)', 'rgba(80, 50, 70, 0)'] as const,
        locations: [0, 0.45, 1] as const,
      };
    }
    return {
      colors: ['rgba(255, 248, 252, 0.95)', 'rgba(255, 232, 245, 0.55)', 'rgba(255, 183, 229, 0.22)'] as const,
      locations: [0, 0.42, 1] as const,
    };
  }, [isDark]);

  const selectionPillBg = isDark ? 'rgba(0, 0, 0, 0.42)' : 'rgba(0, 0, 0, 0.11)';
  const selectionPillShadow = isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.2)';

  useEffect(() => {
    if (Platform.OS === 'web' || !tabBarHideOnKeyboard) return;

    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const openKb = () => {
      cancelAnimation(keyboardHiddenProgress);
      if (a11y.reduceMotion) {
        keyboardHiddenProgress.value = 1;
        return;
      }
      keyboardHiddenProgress.value = withTiming(1, {
        duration: 160,
        easing: Easing.out(Easing.cubic),
      });
    };

    const closeKb = () => {
      cancelAnimation(keyboardHiddenProgress);
      if (a11y.reduceMotion) {
        keyboardHiddenProgress.value = 0;
        return;
      }
      keyboardHiddenProgress.value = withTiming(0, {
        duration: 215,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      });
    };

    const subShow = Keyboard.addListener(showEvt as 'keyboardWillShow', openKb);
    const subHide = Keyboard.addListener(hideEvt as 'keyboardWillHide', closeKb);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [a11y.reduceMotion, keyboardHiddenProgress, tabBarHideOnKeyboard]);

  const setTouchEnabledStable = useCallback((enabled: boolean) => {
    setTouchEnabled((prev) => (prev === enabled ? prev : enabled));
  }, []);

  useAnimatedReaction(
    () => {
      const kbP = keyboardHiddenProgress.value;
      const scrollP = scrollHiddenProgress ? scrollHiddenProgress.value : 0;
      return scrollP < 0.02 && kbP < 0.02;
    },
    (enabled, prev) => {
      if (enabled !== prev) {
        runOnJS(setTouchEnabledStable)(enabled);
      }
    },
    [keyboardHiddenProgress, scrollHiddenProgress, setTouchEnabledStable]
  );

  const outerWidth = useMemo(() => {
    const side = spacing[3];
    const w = windowWidth > 0 ? windowWidth : 390;
    return Math.min(w * OUTER_WIDTH_RATIO, Math.max(0, w - side * 2));
  }, [windowWidth]);

  const bottomOffset = Math.max(spacing[2], spacing[2] + insets.bottom);

  const [trackInnerW, setTrackInnerW] = useState(0);
  const pillX = useSharedValue(0);
  const pillW = useSharedValue(PILL_W);
  const lastSyncedIndexRef = useRef<number | null>(null);

  const activeIndex = state.index;
  const nTabs = state.routes.length;
  const measuredTrackW = trackInnerW > 0 ? trackInnerW : Math.max(0, outerWidth - OUTER_PAD_H * 2);

  const selectionLayouts = useMemo(
    () => (measuredTrackW > 0 && nTabs > 0 ? computeAllTabSelectionLayouts(measuredTrackW, nTabs, MIN_STADIUM_W) : null),
    [measuredTrackW, nTabs]
  );

  const movePillToIndex = useCallback(
    (index: number, animated: boolean) => {
      if (!selectionLayouts?.length) return;
      const safeIndex = Math.max(0, Math.min(index, selectionLayouts.length - 1));
      const { x, w } = selectionLayouts[safeIndex]!;

      cancelAnimation(pillX);
      cancelAnimation(pillW);

      if (animated && !a11y.reduceMotion) {
        pillX.value = withSpring(x, PILL_SPRING);
        pillW.value = withSpring(w, PILL_SPRING_WIDTH);
      } else {
        pillX.value = x;
        pillW.value = w;
      }
      lastSyncedIndexRef.current = safeIndex;
    },
    [a11y.reduceMotion, pillW, pillX, selectionLayouts]
  );

  useLayoutEffect(() => {
    if (!selectionLayouts?.length) return;
    if (lastSyncedIndexRef.current === activeIndex) return;
    const shouldAnimate = lastSyncedIndexRef.current !== null && !a11y.reduceMotion;
    movePillToIndex(activeIndex, shouldAnimate);
  }, [activeIndex, a11y.reduceMotion, movePillToIndex, selectionLayouts]);

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w <= 0) return;
    const rounded = Math.round(w * 1000) / 1000;
    setTrackInnerW((prev) => (prev === rounded ? prev : rounded));
  }, []);

  const onShellLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0) onTabBarHeightChange?.(h);
    },
    [onTabBarHeightChange]
  );

  const handleTabPress = useCallback(
    (route: (typeof state.routes)[number], index: number, isFocused: boolean) => {
      if (isFocused) return;

      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (event.defaultPrevented) return;

      recordTabPress(route.name);

      // Optimistic pill slide — instant feedback; useLayoutEffect syncs when index changes.
      movePillToIndex(index, !a11y.reduceMotion);

      navigation.dispatch({
        ...CommonActions.navigate(route),
        target: state.key,
      });

      recordNavDispatch(route.name);
      queueMicrotask(() => haptics.tab());
    },
    [a11y.reduceMotion, movePillToIndex, navigation, state.key]
  );

  const handleTabLongPress = useCallback(
    (route: (typeof state.routes)[number]) => {
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    },
    [navigation]
  );

  const pillStyle = useAnimatedStyle(() => ({
    width: pillW.value,
    transform: [{ translateX: pillX.value }],
  }));

  const reduceMotion = a11y.reduceMotion;

  const trackBloomOpacityStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 0 };
    const kbP = keyboardHiddenProgress.value;
    const p = scrollHiddenProgress;
    const scrollP = p ? p.value : 0;
    const scrollBump = 4 * scrollP * (1 - scrollP);
    const kbBump = 4 * kbP * (1 - kbP);
    const o = scrollBump > kbBump ? scrollBump : kbBump;
    return { opacity: o };
  }, [reduceMotion, scrollHiddenProgress, keyboardHiddenProgress]);

  const tabBarMotionStyle = useAnimatedStyle(() => {
    const kbP = keyboardHiddenProgress.value;
    const p = scrollHiddenProgress;

    if (a11y.reduceMotion) {
      return { opacity: interpolate(kbP, [0, 1], [1, 0]) };
    }

    const scrollP = p ? p.value : 0;
    const scrollOpacity = interpolate(scrollP, [0, 1], [1, 0]);
    const kbOpacity = interpolate(kbP, [0, 1], [1, 0]);

    // Opacity-only hide: translateY on the pressable tree breaks iOS hit-testing.
    return {
      opacity: scrollOpacity * kbOpacity,
    };
  }, [a11y.reduceMotion, scrollHiddenProgress, keyboardHiddenProgress]);

  const blurIntensity = a11y.reduceTransparency ? 0 : 100;

  return (
    <View
      style={[styles.container, { bottom: bottomOffset }]}
      pointerEvents="box-none"
      onLayout={onShellLayout}
    >
      <Animated.View
        style={tabBarMotionStyle}
        accessibilityRole="tablist"
        pointerEvents={touchEnabled ? 'box-none' : 'none'}
      >
        <LiquidGlass
        style={[styles.outerShell, { width: outerWidth, paddingVertical: OUTER_PAD_V, paddingHorizontal: OUTER_PAD_H }]}
        radius={borderRadius.full}
        intensity={blurIntensity}
        prominent
        shadow
        border
      >
        <View
          style={styles.track}
          onLayout={onTrackLayout}
          pointerEvents={touchEnabled ? 'auto' : 'none'}
        >
          <Animated.View style={[styles.trackBloom, trackBloomOpacityStyle]} pointerEvents="none">
            <LinearGradient
              colors={[...trackBloomGradient.colors]}
              locations={[...trackBloomGradient.locations]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.selectionPill,
              pillStyle,
              {
                height: SELECTION_H,
                borderRadius: SELECTION_STADIUM_R,
                backgroundColor: selectionPillBg,
                shadowColor: selectionPillShadow,
              },
            ]}
          />

          <View style={styles.tabRow} collapsable={false}>
            {state.routes.map((route, index) => {
              const isFocused = activeIndex === index;
              return (
                <TabCell
                  key={route.key}
                  routeName={route.name}
                  isFocused={isFocused}
                  inactiveColor={inactiveColor}
                  activeColor={activeColor}
                  onPress={() => handleTabPress(route, index, isFocused)}
                  onLongPress={() => handleTabLongPress(route)}
                />
              );
            })}
          </View>
        </View>
      </LiquidGlass>
      </Animated.View>
    </View>
  );
}

export const FloatingTabBar = React.memo(FloatingTabBarInner);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  outerShell: {
    alignSelf: 'center',
    overflow: 'hidden',
  },
  track: {
    position: 'relative',
    width: '100%',
    minHeight: TAB_ROW_MIN_H,
    justifyContent: 'center',
  },
  trackBloom: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  selectionPill: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TAB_ROW_MIN_H,
    zIndex: 2,
  },
  tabCellPressable: {
    flex: 1,
    zIndex: 3,
  },
  tabCellInner: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: TAB_LABEL_GAP,
    minHeight: TAB_ROW_MIN_H,
    paddingVertical: 3,
  },
  tabLabel: {
    ...typography.caption2,
    textAlign: 'center',
    letterSpacing: 0.04,
    width: '100%',
  },
  tabIconFocused: {
    fontWeight: '700',
  },
  tabIconInactive: {
    fontWeight: '500',
  },
});
