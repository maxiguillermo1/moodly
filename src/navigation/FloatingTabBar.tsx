/**
 * @fileoverview iOS-style floating tab bar (like iOS 18 search bubble)
 * @module navigation/FloatingTabBar
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, borderRadius, sizing } from '../theme';
import { LiquidGlass } from '../components';
import { Touchable } from '../ui/Touchable';

const TAB_ICONS: Record<string, any> = {
  Calendar: 'calendar-outline',
  Today: 'sunny-outline',
  Journal: 'book-outline',
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { width: windowWidth } = useWindowDimensions();
  // Wider capsule so the 3 tabs don't feel squished (explicit user request).
  // Keep it bounded so it still feels iOS-like on small screens.
  const tabBarWidthStyle = useMemo(() => {
    const maxW = 340;
    const minW = 272;
    const sideGutter = spacing[6]; // visual gutter from screen edges
    const w = Math.min(maxW, Math.max(minW, windowWidth - sideGutter * 2));
    return { width: w };
  }, [windowWidth]);

  return (
    <View style={styles.container}>
      <LiquidGlass
        style={[styles.tabBar, tabBarWidthStyle]}
        radius={borderRadius.full}
        intensity={60}
        shadow
        border
      >
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
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint={isFocused ? 'Current tab' : `Switches to ${route.name}`}
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={({ pressed }) => [styles.tab, pressed ? styles.pressedOpacity : null]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <View style={styles.iconStack} pointerEvents="none">
                <Ionicons
                  name={TAB_ICONS[route.name]}
                  size={sizing.iconSm}
                  color={isFocused ? colors.system.blue : colors.system.secondaryLabel}
                />
                <View style={[styles.indicator, isFocused && styles.indicatorActive]} />
              </View>
            </Touchable>
          );
        })}
      </LiquidGlass>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing[8],
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    // iOS Calendar-like capsule
    height: 46,
    paddingHorizontal: spacing[3],
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    // LiquidGlass handles background/border/shadow. Keep layout-only props here.
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    minHeight: sizing.minTouchTarget,
    borderRadius: borderRadius.full,
  },
  pressedOpacity: { opacity: 0.7 },
  iconStack: {
    // Fixed height + absolute dot guarantees perfect centering under the icon.
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    width: 28,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: colors.system.blue,
  },
});
