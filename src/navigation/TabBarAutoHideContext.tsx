/**
 * @fileoverview Shared tab bar hide/show driven by vertical scroll on select tabs.
 * @module navigation/TabBarAutoHideContext
 */

import React, { createContext, useCallback, useContext, useMemo } from 'react';
import {
  cancelAnimation,
  useSharedValue,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { useAppTheme } from '../theme';

const TAB_BAR_HIDE_DURATION_MS = 88;
/** Slightly longer than hide so the bar can ease in with opacity + slide without feeling abrupt. */
const TAB_BAR_SHOW_DURATION_MS = 140;

export type TabBarAutoHideContextValue = {
  tabBarHiddenProgress: SharedValue<number>;
  hideTabBar: () => void;
  showTabBar: () => void;
};

const TabBarAutoHideContext = createContext<TabBarAutoHideContextValue | null>(null);

export function TabBarAutoHideProvider({ children }: { children: React.ReactNode }) {
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

  const value = useMemo(
    () => ({ tabBarHiddenProgress, hideTabBar, showTabBar }),
    [hideTabBar, showTabBar, tabBarHiddenProgress]
  );

  return <TabBarAutoHideContext.Provider value={value}>{children}</TabBarAutoHideContext.Provider>;
}

export function useTabBarAutoHide(): TabBarAutoHideContextValue {
  const ctx = useContext(TabBarAutoHideContext);
  if (!ctx) {
    throw new Error('useTabBarAutoHide must be used within TabBarAutoHideProvider');
  }
  return ctx;
}

/** For the tab bar itself when the provider may be absent (falls back to visible). */
export function useTabBarAutoHideOptional(): TabBarAutoHideContextValue | null {
  return useContext(TabBarAutoHideContext);
}
