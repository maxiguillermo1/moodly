/**
 * @fileoverview Floating bottom tab bar — Expo Go–style compact pill; Bloom pink only during bar motion transitions.
 * @module navigation/FloatingTabBar
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Pressable, Keyboard, InteractionManager, Text, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, sizing, borderRadius, typography, useAppTheme } from '../theme';
import { LiquidGlass } from '../components';
import { useTabBarAutoHideOptional } from './TabBarAutoHideContext';
import { perfProbe } from '../perf';
import { DEFAULT_HIT_SLOP } from '../system/accessibility';
import { haptics } from '../system/haptics';
import { logger } from '../security';
import { nearestTabFromPillCenter } from '../utils';

/** Slightly roomier pill; wider ratio widens slots → more space between icon centers (same nudge). */
const OUTER_WIDTH_RATIO = 0.54;
const OUTER_PAD_V = 6;
const OUTER_PAD_H = 6;
const TRACK_PAD_H = 0;
/** No gap between slot columns — icons as close as equal flex allows. */
const SLOT_GAP = 0;

const ICON_SIZE = 18;
/** Horizontal padding inside selection pill around icon (tight fit). */
const PILL_PAD_H = 7;
const PILL_W = ICON_SIZE + PILL_PAD_H * 2;
/** Vertical gap between icon and label (px). */
const TAB_LABEL_GAP = 3;
const TAB_LABEL_LINE_H = Math.ceil(Number(typography.caption2.lineHeight ?? 12));
const TAB_STACK_H = ICON_SIZE + TAB_LABEL_GAP + TAB_LABEL_LINE_H;
const TAB_ROW_MIN_H = Math.max(sizing.minTouchTarget, TAB_STACK_H + 12);
/** Selection uses full row height so stadium ends match the bar’s inner vertical bounds. */
const SELECTION_H = TAB_ROW_MIN_H;
const SELECTION_STADIUM_R = SELECTION_H / 2;
/** Stadium “pill” needs width ≥ height for proper semicircle caps. */
const MIN_STADIUM_W = SELECTION_H;
const TAB_BAR_VISUAL_HEIGHT = OUTER_PAD_V * 2 + TAB_ROW_MIN_H + 2;
const TAB_BAR_HIDE_OVERFLOW = 28;

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

/** Selection pill: softer spring + tight rest thresholds for smooth settle (UI-thread only). */
const PILL_SPRING = {
  stiffness: 96,
  damping: 58,
  mass: 1.42,
  overshootClamping: false,
  restDisplacementThreshold: 0.22,
  restSpeedThreshold: 0.22,
} as const;
/** Width eases slightly after x — same family, a touch softer to reduce cross-axis “fight”. */
const PILL_SPRING_WIDTH = {
  stiffness: 76,
  damping: 52,
  mass: 1.36,
  overshootClamping: false,
  restDisplacementThreshold: 0.36,
  restSpeedThreshold: 0.32,
} as const;
const PRESS_TIMING = { duration: 90, easing: Easing.out(Easing.cubic) } as const;
const PRESS_SPRING = { damping: 18, stiffness: 400, mass: 0.72 } as const;

const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

/**
 * Positions the selection so end tabs flush to the inner track edge (icon-centered width 2·cx / 2·(R−cx));
 * middle tabs fill each slot so the stadium is equally visible.
 */
function computeSelectionLayout(params: {
  trackInnerW: number;
  nTabs: number;
  index: number;
}): { x: number; w: number } {
  const { trackInnerW, nTabs, index } = params;
  const symW = PILL_W;
  if (trackInnerW <= 0 || nTabs <= 0) return { x: 0, w: symW };

  const trackW = Math.max(0, trackInnerW - 2 * TRACK_PAD_H);
  const slotW = (trackW - (nTabs - 1) * SLOT_GAP) / nTabs;
  const slotStart = (i: number) => TRACK_PAD_H + i * (slotW + SLOT_GAP);
  const cx = slotStart(index) + slotW / 2;
  const rightInner = TRACK_PAD_H + trackW;

  if (nTabs === 1) {
    return { x: 0, w: Math.max(MIN_STADIUM_W, trackInnerW) };
  }

  if (index === 0) {
    // Left edge flush at 0; width 2·cx so icon center (cx) is the geometric center of the pill.
    const w = Math.min(rightInner, Math.max(MIN_STADIUM_W, symW, 2 * cx));
    return { x: 0, w };
  }

  if (index === nTabs - 1) {
    // Right edge flush at rightInner; width 2·(rightInner − cx) centers icon in the pill.
    let w = Math.max(MIN_STADIUM_W, symW, 2 * (rightInner - cx));
    let x = rightInner - w;
    if (x < TRACK_PAD_H) {
      x = TRACK_PAD_H;
      w = rightInner - x;
    }
    return { x, w };
  }

  return computeMiddleSelectionLayout(params);
}

/** Middle tabs: fill the slot (minus inset) so the stadium reads as clearly as the wider edge pills. */
function computeMiddleSelectionLayout(params: {
  trackInnerW: number;
  nTabs: number;
  index: number;
}): { x: number; w: number } {
  const { trackInnerW, nTabs, index } = params;
  const symW = PILL_W;
  const trackW = Math.max(0, trackInnerW - 2 * TRACK_PAD_H);
  const slotW = (trackW - (nTabs - 1) * SLOT_GAP) / nTabs;
  const slotStart = (i: number) => TRACK_PAD_H + i * (slotW + SLOT_GAP);
  const cx = slotStart(index) + slotW / 2;
  const rightInner = TRACK_PAD_H + trackW;
  const slotLeft = slotStart(index);
  const inset = 2;
  const wCap = slotW - inset * 2;
  let w = Math.max(MIN_STADIUM_W, symW, wCap);
  if (w > wCap) w = wCap;
  let x = cx - w / 2;
  x = Math.max(slotLeft + inset, Math.min(x, slotLeft + slotW - w - inset));
  x = Math.max(TRACK_PAD_H, Math.min(x, rightInner - w));
  return { x, w };
}

type TabCellProps = {
  routeKey: string;
  routeName: string;
  tabIndex: number;
  isFocused: boolean;
  visualTabSV: SharedValue<number>;
  navigation: BottomTabBarProps['navigation'];
  inactiveColor: string;
  activeColor: string;
};

const TabCell = React.memo(function TabCell({
  routeKey,
  routeName,
  tabIndex,
  isFocused,
  visualTabSV,
  navigation,
  inactiveColor,
  activeColor,
}: TabCellProps) {
  const scale = useSharedValue(1);

  const onPress = useCallback(() => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      perfProbe.onMainTabPress(routeName);
      navigation.navigate(routeName as never);
      queueMicrotask(() => {
        haptics.tab();
      });
    }
  }, [isFocused, navigation, routeKey, routeName]);

  const onPressIn = useCallback(() => {
    scale.value = withTiming(0.94, PRESS_TIMING);
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, PRESS_SPRING);
  }, [scale]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }), [scale]);

  const filledIconOpacity = useAnimatedStyle(() => ({
    opacity: visualTabSV.value === tabIndex ? 1 : 0,
  }), [visualTabSV, tabIndex]);

  const outlineIconOpacity = useAnimatedStyle(() => ({
    opacity: visualTabSV.value === tabIndex ? 0 : 1,
  }), [visualTabSV, tabIndex]);

  const labelVisualStyle = useAnimatedStyle(() => {
    const on = visualTabSV.value === tabIndex;
    return {
      color: on ? activeColor : inactiveColor,
      fontWeight: on ? '700' : '500',
    };
  }, [visualTabSV, tabIndex, activeColor, inactiveColor]);

  const iconFilledName = TAB_ICONS_FILLED[routeName] ?? TAB_ICONS_FILLED.Today;
  const iconOutlineName = TAB_ICONS_OUTLINE[routeName] ?? TAB_ICONS_OUTLINE.Today;

  const a11y = `${TAB_LABELS[routeName] ?? routeName} tab`;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={a11y}
      accessibilityHint={isFocused ? 'Current tab' : `Switches to ${TAB_LABELS[routeName] ?? routeName}`}
      accessibilityState={{ selected: isFocused }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={DEFAULT_HIT_SLOP}
      style={styles.tabCellPressable}
    >
      <Animated.View style={[styles.tabCellInner, pressStyle]}>
        <View style={styles.tabIconStack} pointerEvents="none">
          <AnimatedIonicons
            name={iconFilledName}
            size={ICON_SIZE}
            color={activeColor}
            style={[styles.tabIconLayer, styles.tabIconFocused, filledIconOpacity]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <AnimatedIonicons
            name={iconOutlineName}
            size={ICON_SIZE}
            color={inactiveColor}
            style={[styles.tabIconLayer, styles.tabIconInactive, outlineIconOpacity]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <AnimatedText
          style={[styles.tabLabel, labelVisualStyle]}
          allowFontScaling
          maxFontSizeMultiplier={1.22}
          numberOfLines={1}
          accessible={false}
        >
          {TAB_LABELS[routeName] ?? routeName}
        </AnimatedText>
      </Animated.View>
    </Pressable>
  );
});

function FloatingTabBarInner({ state, navigation, descriptors, insets }: BottomTabBarProps) {
  const { system: sys, a11y, windowWidth, isDark } = useAppTheme();
  const tabBarAutoHide = useTabBarAutoHideOptional();

  const scrollHiddenProgress = tabBarAutoHide?.tabBarHiddenProgress ?? null;
  const keyboardHiddenProgress = useSharedValue(0);

  const focusedRoute = state.routes[state.index];
  const tabBarHideOnKeyboard = descriptors[focusedRoute?.key]?.options.tabBarHideOnKeyboard ?? true;

  /** Inactive: soft gray. Active: black (light) / white (dark) on selection pill + heavier glyph weight. */
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

    const subShow = Keyboard.addListener(showEvt as any, openKb);
    const subHide = Keyboard.addListener(hideEvt as any, closeKb);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [a11y.reduceMotion, keyboardHiddenProgress, tabBarHideOnKeyboard]);

  const journalPreloadDone = useRef(false);
  useEffect(() => {
    if (journalPreloadDone.current) return;
    const task = InteractionManager.runAfterInteractions(() => {
      if (journalPreloadDone.current) return;
      try {
        const tabState = navigation.getState();
        const routes = tabState?.routes;
        if (!routes?.some((r) => r.name === 'Journal')) return;
        navigation.dispatch(CommonActions.preload('Journal'));
        journalPreloadDone.current = true;
        logger.perf('nav.tab.preload', { phase: 'warm', source: 'ui', tab: 'Journal' });
      } catch {
        logger.warn('nav.tab.preload.failed', { tab: 'Journal' });
      }
    });
    return () => task.cancel();
  }, [navigation]);

  const outerWidth = useMemo(() => {
    const side = spacing[3];
    return Math.min(windowWidth * OUTER_WIDTH_RATIO, Math.max(0, windowWidth - side * 2));
  }, [windowWidth]);

  const bottomOffset = Math.max(spacing[2], spacing[2] + insets.bottom);
  const hideSlidePx = TAB_BAR_VISUAL_HEIGHT + bottomOffset + TAB_BAR_HIDE_OVERFLOW;

  const [trackInnerW, setTrackInnerW] = useState(0);
  const pillX = useSharedValue(0);
  const pillW = useSharedValue(PILL_W);
  const pillVisualOpacity = useSharedValue(1);
  const prevTabIndexRef = useRef<number | null>(null);
  const trackInnerWSV = useSharedValue(0);
  const nTabsSV = useSharedValue(state.routes.length);
  const visualTabSV = useSharedValue(state.index);

  const nTabs = state.routes.length;

  useEffect(() => {
    trackInnerWSV.value = trackInnerW;
    nTabsSV.value = nTabs;
  }, [trackInnerW, nTabs, trackInnerWSV, nTabsSV]);

  useAnimatedReaction(
    () => ({
      px: pillX.value,
      pw: pillW.value,
      tw: trackInnerWSV.value,
      n: nTabsSV.value,
    }),
    (c) => {
      const best = nearestTabFromPillCenter(c.px, c.pw, c.tw, c.n, TRACK_PAD_H, SLOT_GAP);
      if (best !== visualTabSV.value) {
        visualTabSV.value = best;
      }
    }
  );

  useEffect(() => {
    if (trackInnerW <= 0 || nTabs <= 0) return;
    const { x, w } = computeSelectionLayout({ trackInnerW, nTabs, index: state.index });

    const prev = prevTabIndexRef.current;
    const indexChanged = prev !== null && prev !== state.index;
    prevTabIndexRef.current = state.index;

    if (a11y.reduceMotion) {
      cancelAnimation(pillX);
      cancelAnimation(pillW);
      cancelAnimation(pillVisualOpacity);
      pillX.value = x;
      pillW.value = w;
      pillVisualOpacity.value = 1;
      visualTabSV.value = state.index;
      return;
    }

    pillX.value = withSpring(x, PILL_SPRING);
    pillW.value = withSpring(w, PILL_SPRING_WIDTH);

    if (indexChanged) {
      cancelAnimation(pillVisualOpacity);
      pillVisualOpacity.value = withSequence(
        withTiming(0.88, {
          duration: 88,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        withTiming(1, {
          duration: 280,
          easing: Easing.bezier(0.17, 1, 0.2, 1),
        })
      );
    }
  }, [trackInnerW, state.index, nTabs, a11y.reduceMotion, pillX, pillW, pillVisualOpacity, visualTabSV]);

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setTrackInnerW(Math.round(w * 1000) / 1000);
  }, []);

  const pillStyle = useAnimatedStyle(() => ({
    width: pillW.value,
    opacity: pillVisualOpacity.value,
    transform: [{ translateX: pillX.value }],
  }), []);

  const reduceMotion = a11y.reduceMotion;

  /** Bloom tint only while tab bar motion is in progress (scroll hide/show, keyboard hide). */
  const trackBloomOpacityStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { opacity: 0 };
    }
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
    const scrollY = interpolate(scrollP, [0, 1], [0, hideSlidePx]);
    const kbY = interpolate(kbP, [0, 1], [0, hideSlidePx * 0.88]);

    return {
      opacity: scrollOpacity * kbOpacity,
      transform: [{ translateY: scrollY + kbY }],
    };
  }, [a11y.reduceMotion, hideSlidePx, scrollHiddenProgress, keyboardHiddenProgress]);

  const blurIntensity = a11y.reduceTransparency ? 0 : Platform.OS === 'android' ? 100 : 100;

  const selectionStadiumStyle = useMemo(
    () => ({
      height: SELECTION_H,
      borderTopLeftRadius: SELECTION_STADIUM_R,
      borderBottomLeftRadius: SELECTION_STADIUM_R,
      borderTopRightRadius: SELECTION_STADIUM_R,
      borderBottomRightRadius: SELECTION_STADIUM_R,
    }),
    []
  );

  return (
    <Animated.View
      style={[styles.container, { bottom: bottomOffset }, tabBarMotionStyle]}
      accessibilityRole="tablist"
      pointerEvents="box-none"
    >
      <LiquidGlass
        style={[styles.outerShell, { width: outerWidth, paddingVertical: OUTER_PAD_V, paddingHorizontal: OUTER_PAD_H }]}
        radius={borderRadius.full}
        intensity={blurIntensity}
        prominent
        shadow
        border
      >
        <View style={styles.track} onLayout={onTrackLayout}>
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
              selectionStadiumStyle,
              {
                top: 0,
                backgroundColor: selectionPillBg,
                shadowColor: selectionPillShadow,
              },
            ]}
          />

          <View style={styles.tabRow}>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;
              return (
                <TabCell
                  key={route.key}
                  routeKey={route.key}
                  routeName={route.name}
                  tabIndex={index}
                  isFocused={isFocused}
                  visualTabSV={visualTabSV}
                  navigation={navigation}
                  inactiveColor={inactiveColor}
                  activeColor={activeColor}
                />
              );
            })}
          </View>
        </View>
      </LiquidGlass>
    </Animated.View>
  );
}

export const FloatingTabBar = React.memo(FloatingTabBarInner);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  outerShell: {
    alignSelf: 'center',
    overflow: 'hidden',
  },
  track: {
    position: 'relative',
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
  },
  tabIconStack: {
    width: ICON_SIZE + 8,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconLayer: {
    position: 'absolute',
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
