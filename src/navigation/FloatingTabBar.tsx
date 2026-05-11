/**
 * @fileoverview iOS-style floating tab bar (like iOS 18 search bubble)
 * @module navigation/FloatingTabBar
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, borderRadius, sizing, useAppTheme } from '../theme';
import { LiquidGlass } from '../components';
import { Touchable } from '../ui/Touchable';

const TAB_ICONS: Record<string, any> = {
  Calendar: 'calendar-outline',
  Today: 'sunny-outline',
  Journal: 'book-outline',
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { system, a11y, windowWidth, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const tabBarWidthStyle = useMemo(() => {
    const maxW = 288;
    const minW = 240;
    const sideGutter = spacing[6];
    const w = Math.min(maxW, Math.max(minW, windowWidth - sideGutter * 2));
    return { width: w };
  }, [windowWidth]);

  /** Small gap above home indicator; never flush with screen edge */
  const bottomOffset = Math.max(spacing[2], spacing[2] + insets.bottom);

  const blurIntensity = a11y.reduceTransparency
    ? 0
    : Platform.OS === 'android'
      ? 48
      : isDark
        ? 54
        : 62;

  return (
    <View style={[styles.container, { bottom: bottomOffset }]} accessibilityRole="tablist">
      <LiquidGlass
        style={[styles.tabBar, tabBarWidthStyle]}
        radius={borderRadius.full}
        intensity={blurIntensity}
        shadow
        border
      >
        <View style={styles.tabsInner}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const label = `${route.name} tab`;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Touchable
                key={route.key}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityHint={isFocused ? 'Current tab' : `Switches to ${route.name}`}
                accessibilityState={{ selected: isFocused }}
                onPress={onPress}
                style={({ pressed }) => [styles.tab, pressed ? styles.pressedOpacity : null]}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <View style={styles.iconStack} pointerEvents="none">
                  <Ionicons
                    name={TAB_ICONS[route.name]}
                    size={isFocused ? 22 : sizing.iconSm}
                    color={isFocused ? system.blue : system.secondaryLabel}
                  />
                  <View
                    style={[
                      styles.indicator,
                      isFocused ? { backgroundColor: system.blue, opacity: 1 } : styles.indicatorInactive,
                    ]}
                  />
                </View>
              </Touchable>
            );
          })}
        </View>
      </LiquidGlass>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: spacing[4],
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: spacing[2],
  },
  tab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    minWidth: 52,
    minHeight: sizing.minTouchTarget,
    borderRadius: borderRadius.full,
  },
  pressedOpacity: { opacity: 0.7 },
  iconStack: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    width: 28,
  },
  indicator: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 3,
    borderRadius: 1.5,
    opacity: 0,
  },
  indicatorInactive: {
    backgroundColor: 'transparent',
  },
});
