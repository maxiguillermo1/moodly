import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Shared tab bar hide/show driven by vertical scroll on select tabs.
 * @module navigation/TabBarAutoHideContext
 */
import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { cancelAnimation, useSharedValue, withTiming, Easing, } from 'react-native-reanimated';
import { useAppTheme } from '../theme';
const TAB_BAR_HIDE_DURATION_MS = 88;
/** Slightly longer than hide so the bar can ease in with opacity + slide without feeling abrupt. */
const TAB_BAR_SHOW_DURATION_MS = 140;
const TabBarAutoHideContext = createContext(null);
export function TabBarAutoHideProvider({ children }) {
    const { a11y } = useAppTheme();
    const tabBarHiddenProgress = useSharedValue(0);
    const hideTabBar = useCallback(() => {
        cancelAnimation(tabBarHiddenProgress);
        const d = a11y.reduceMotion ? 1 : TAB_BAR_HIDE_DURATION_MS;
        tabBarHiddenProgress.value = withTiming(1, {
            duration: d,
            easing: Easing.out(Easing.cubic),
        });
    }, [a11y.reduceMotion, tabBarHiddenProgress]);
    const showTabBar = useCallback(() => {
        cancelAnimation(tabBarHiddenProgress);
        const d = a11y.reduceMotion ? 1 : TAB_BAR_SHOW_DURATION_MS;
        tabBarHiddenProgress.value = withTiming(0, {
            duration: d,
            // Softer deceleration at the end pairs with opacity fade-in on the floating pill.
            easing: Easing.bezier(0.22, 1, 0.36, 1),
        });
    }, [a11y.reduceMotion, tabBarHiddenProgress]);
    const value = useMemo(() => ({ tabBarHiddenProgress, hideTabBar, showTabBar }), [hideTabBar, showTabBar, tabBarHiddenProgress]);
    return _jsx(TabBarAutoHideContext.Provider, { value: value, children: children });
}
export function useTabBarAutoHide() {
    const ctx = useContext(TabBarAutoHideContext);
    if (!ctx) {
        throw new Error('useTabBarAutoHide must be used within TabBarAutoHideProvider');
    }
    return ctx;
}
/** For the tab bar itself when the provider may be absent (falls back to visible). */
export function useTabBarAutoHideOptional() {
    return useContext(TabBarAutoHideContext);
}
