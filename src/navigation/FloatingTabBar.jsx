import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview Floating bottom tab bar — Expo Go–style compact pill; Bloom pink only during bar motion transitions.
 * @module navigation/FloatingTabBar
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Pressable, Keyboard, InteractionManager, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedReaction, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, } from 'react-native-reanimated';
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
import { computeAllTabSelectionLayouts, TAB_SELECTION_SLOT_GAP, TAB_SELECTION_SYM_W, TAB_SELECTION_TRACK_PAD_H, } from './tabBarSelectionLayout';
/** Slightly roomier pill; wider ratio widens slots → more space between icon centers (same nudge). */
const OUTER_WIDTH_RATIO = 0.54;
const OUTER_PAD_V = 6;
const OUTER_PAD_H = 6;
const TRACK_PAD_H = TAB_SELECTION_TRACK_PAD_H;
/** No gap between slot columns — icons as close as equal flex allows. */
const SLOT_GAP = TAB_SELECTION_SLOT_GAP;
const ICON_SIZE = 18;
const PILL_W = TAB_SELECTION_SYM_W;
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
const TAB_ICONS_OUTLINE = {
    Calendar: 'calendar-outline',
    Today: 'sunny-outline',
    Journal: 'book-outline',
};
const TAB_ICONS_FILLED = {
    Calendar: 'calendar',
    Today: 'sunny',
    Journal: 'book',
};
const TAB_LABELS = {
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
};
/** Width eases slightly after x — same family, a touch softer to reduce cross-axis “fight”. */
const PILL_SPRING_WIDTH = {
    stiffness: 76,
    damping: 52,
    mass: 1.36,
    overshootClamping: false,
    restDisplacementThreshold: 0.36,
    restSpeedThreshold: 0.32,
};
const PRESS_TIMING = { duration: 90, easing: Easing.out(Easing.cubic) };
const PRESS_SPRING = { damping: 18, stiffness: 400, mass: 0.72 };
const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);
const TabCell = React.memo(function TabCell({ routeKey, routeName, tabIndex, isFocused, visualTabSV, navigation, inactiveColor, activeColor, onTabSelectIntent, }) {
    const scale = useSharedValue(1);
    const onPress = useCallback(() => {
        const event = navigation.emit({
            type: 'tabPress',
            target: routeKey,
            canPreventDefault: true,
        });
        if (!isFocused && !event.defaultPrevented) {
            onTabSelectIntent(tabIndex);
            navigation.navigate(routeName);
            haptics.tab();
            perfProbe.onMainTabPress(routeName);
        }
    }, [isFocused, navigation, onTabSelectIntent, routeKey, routeName, tabIndex]);
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
    return (_jsx(Pressable, { accessibilityRole: "tab", accessibilityLabel: a11y, accessibilityHint: isFocused ? 'Current tab' : `Switches to ${TAB_LABELS[routeName] ?? routeName}`, accessibilityState: { selected: isFocused }, onPress: onPress, onPressIn: onPressIn, onPressOut: onPressOut, hitSlop: DEFAULT_HIT_SLOP, style: styles.tabCellPressable, children: _jsxs(Animated.View, { style: [styles.tabCellInner, pressStyle], children: [_jsxs(View, { style: styles.tabIconStack, pointerEvents: "none", children: [_jsx(AnimatedIonicons, { name: iconFilledName, size: ICON_SIZE, color: activeColor, style: [styles.tabIconLayer, styles.tabIconFocused, filledIconOpacity], accessibilityElementsHidden: true, importantForAccessibility: "no" }), _jsx(AnimatedIonicons, { name: iconOutlineName, size: ICON_SIZE, color: inactiveColor, style: [styles.tabIconLayer, styles.tabIconInactive, outlineIconOpacity], accessibilityElementsHidden: true, importantForAccessibility: "no" })] }), _jsx(AnimatedText, { style: [styles.tabLabel, labelVisualStyle], allowFontScaling: true, maxFontSizeMultiplier: 1.22, numberOfLines: 1, accessible: false, children: TAB_LABELS[routeName] ?? routeName })] }) }));
});
function FloatingTabBarInner({ state, navigation, descriptors, insets }) {
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
                colors: ['rgba(255, 183, 229, 0.14)', 'rgba(255, 140, 200, 0.08)', 'rgba(80, 50, 70, 0)'],
                locations: [0, 0.45, 1],
            };
        }
        return {
            colors: ['rgba(255, 248, 252, 0.95)', 'rgba(255, 232, 245, 0.55)', 'rgba(255, 183, 229, 0.22)'],
            locations: [0, 0.42, 1],
        };
    }, [isDark]);
    const selectionPillBg = isDark ? 'rgba(0, 0, 0, 0.42)' : 'rgba(0, 0, 0, 0.11)';
    const selectionPillShadow = isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.2)';
    useEffect(() => {
        if (Platform.OS === 'web' || !tabBarHideOnKeyboard)
            return;
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
        const subShow = Keyboard.addListener(showEvt, openKb);
        const subHide = Keyboard.addListener(hideEvt, closeKb);
        return () => {
            subShow.remove();
            subHide.remove();
        };
    }, [a11y.reduceMotion, keyboardHiddenProgress, tabBarHideOnKeyboard]);
    const tabsPreloadedRef = useRef(false);
    useEffect(() => {
        if (tabsPreloadedRef.current)
            return;
        const preloadInactiveTabs = () => {
            if (tabsPreloadedRef.current)
                return;
            try {
                const tabState = navigation.getState();
                const routes = tabState?.routes;
                if (!routes?.length)
                    return;
                const focused = routes[tabState.index ?? 0]?.name;
                for (const route of routes) {
                    if (route.name === focused)
                        continue;
                    navigation.dispatch(CommonActions.preload(route.name));
                    if (route.name === 'Journal') {
                        try {
                            const { warmJournalSortedDescCacheIfPrimed } = require('../data/storage/moodStorage');
                            warmJournalSortedDescCacheIfPrimed();
                        }
                        catch {
                            /* best-effort */
                        }
                    }
                    if (route.name === 'Calendar') {
                        try {
                            const { warmMoodCalendarSnapshotCacheIfPrimed } = require('../data/storage/calendarSnapshot');
                            warmMoodCalendarSnapshotCacheIfPrimed();
                        }
                        catch {
                            /* best-effort */
                        }
                    }
                    if (route.name === 'Today') {
                        try {
                            const { getToday } = require('../lib/utils/date');
                            const today = getToday();
                            const { warmDayTodosCacheIfPrimed } = require('../data/storage/tasksStorage');
                            warmDayTodosCacheIfPrimed(today);
                        }
                        catch {
                            /* best-effort */
                        }
                    }
                    logger.perf('nav.tab.preload', { phase: 'warm', source: 'ui', tab: route.name });
                }
                tabsPreloadedRef.current = true;
            }
            catch {
                logger.warn('nav.tab.preload.failed', { tab: 'all' });
            }
        };
        queueMicrotask(preloadInactiveTabs);
        const task = InteractionManager.runAfterInteractions(preloadInactiveTabs);
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
    const prevTabIndexRef = useRef(null);
    const trackInnerWSV = useSharedValue(0);
    const nTabsSV = useSharedValue(state.routes.length);
    const visualTabSV = useSharedValue(state.index);
    const nTabs = state.routes.length;
    const selectionLayouts = useMemo(() => (trackInnerW > 0 && nTabs > 0 ? computeAllTabSelectionLayouts(trackInnerW, nTabs, MIN_STADIUM_W) : null), [trackInnerW, nTabs]);
    const selectionLayoutKey = selectionLayouts ? `${trackInnerW}:${nTabs}` : '';
    const selectionLayoutKeyRef = useRef('');
    const animatePillToIndex = useCallback((index) => {
        if (!selectionLayouts || index < 0 || index >= selectionLayouts.length)
            return;
        const { x, w } = selectionLayouts[index];
        const layoutChanged = selectionLayoutKeyRef.current !== selectionLayoutKey;
        selectionLayoutKeyRef.current = selectionLayoutKey;
        const prev = prevTabIndexRef.current;
        const indexChanged = prev !== null && prev !== index;
        const isFirstPosition = prev === null;
        if (prev === index && !layoutChanged)
            return;
        prevTabIndexRef.current = index;
        if (a11y.reduceMotion || isFirstPosition || layoutChanged) {
            cancelAnimation(pillX);
            cancelAnimation(pillW);
            cancelAnimation(pillVisualOpacity);
            pillX.value = x;
            pillW.value = w;
            pillVisualOpacity.value = 1;
            visualTabSV.value = index;
            return;
        }
        cancelAnimation(pillX);
        cancelAnimation(pillW);
        pillX.value = withSpring(x, PILL_SPRING);
        pillW.value = withSpring(w, PILL_SPRING_WIDTH);
        visualTabSV.value = index;
        if (indexChanged) {
            cancelAnimation(pillVisualOpacity);
            pillVisualOpacity.value = withSequence(withTiming(0.88, {
                duration: 88,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
            }), withTiming(1, {
                duration: 280,
                easing: Easing.bezier(0.17, 1, 0.2, 1),
            }));
        }
    }, [
        a11y.reduceMotion,
        pillVisualOpacity,
        pillW,
        pillX,
        selectionLayoutKey,
        selectionLayouts,
        visualTabSV,
    ]);
    const onTabSelectIntent = useCallback((index) => {
        animatePillToIndex(index);
    }, [animatePillToIndex]);
    useLayoutEffect(() => {
        animatePillToIndex(state.index);
    }, [animatePillToIndex, state.index]);
    useEffect(() => {
        trackInnerWSV.value = trackInnerW;
        nTabsSV.value = nTabs;
    }, [trackInnerW, nTabs, trackInnerWSV, nTabsSV]);
    useAnimatedReaction(() => ({
        px: pillX.value,
        pw: pillW.value,
        tw: trackInnerWSV.value,
        n: nTabsSV.value,
    }), (c) => {
        const best = nearestTabFromPillCenter(c.px, c.pw, c.tw, c.n, TRACK_PAD_H, SLOT_GAP);
        if (best !== visualTabSV.value) {
            visualTabSV.value = best;
        }
    });
    const onTrackLayout = useCallback((e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0)
            setTrackInnerW(Math.round(w * 1000) / 1000);
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
    const selectionStadiumStyle = useMemo(() => ({
        height: SELECTION_H,
        borderTopLeftRadius: SELECTION_STADIUM_R,
        borderBottomLeftRadius: SELECTION_STADIUM_R,
        borderTopRightRadius: SELECTION_STADIUM_R,
        borderBottomRightRadius: SELECTION_STADIUM_R,
    }), []);
    return (_jsx(Animated.View, { style: [styles.container, { bottom: bottomOffset }, tabBarMotionStyle], accessibilityRole: "tablist", pointerEvents: "box-none", children: _jsx(LiquidGlass, { style: [styles.outerShell, { width: outerWidth, paddingVertical: OUTER_PAD_V, paddingHorizontal: OUTER_PAD_H }], radius: borderRadius.full, intensity: blurIntensity, prominent: true, shadow: true, border: true, children: _jsxs(View, { style: styles.track, onLayout: onTrackLayout, children: [_jsx(Animated.View, { style: [styles.trackBloom, trackBloomOpacityStyle], pointerEvents: "none", children: _jsx(LinearGradient, { colors: [...trackBloomGradient.colors], locations: [...trackBloomGradient.locations], start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, style: StyleSheet.absoluteFill }) }), _jsx(Animated.View, { pointerEvents: "none", style: [
                            styles.selectionPill,
                            pillStyle,
                            selectionStadiumStyle,
                            {
                                top: 0,
                                backgroundColor: selectionPillBg,
                                shadowColor: selectionPillShadow,
                            },
                        ] }), _jsx(View, { style: styles.tabRow, children: state.routes.map((route, index) => {
                            const isFocused = state.index === index;
                            return (_jsx(TabCell, { routeKey: route.key, routeName: route.name, tabIndex: index, isFocused: isFocused, visualTabSV: visualTabSV, navigation: navigation, inactiveColor: inactiveColor, activeColor: activeColor, onTabSelectIntent: onTabSelectIntent }, route.key));
                        }) })] }) }) }));
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
