/**
 * @fileoverview iOS-style floating tab bar (like iOS 18 search bubble)
 * @module navigation/FloatingTabBar
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, borderRadius, shadows, sizing } from '../theme';
import { LiquidGlass } from '../components';

const TAB_ICONS: Record<string, any> = {
  Calendar: 'calendar-outline',
  Today: 'sunny-outline',
  Journal: 'book-outline',
};

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      <LiquidGlass
        style={styles.tabBar}
        radius={borderRadius.full}
        intensity={60}
        shadow
        border
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

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
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <Ionicons
                name={TAB_ICONS[route.name]}
                size={20}
                color={isFocused ? colors.system.blue : colors.system.secondaryLabel}
              />
              <View style={[styles.indicator, isFocused && styles.indicatorActive]} />
            </TouchableOpacity>
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
    height: 52,
    paddingHorizontal: spacing[2],
    paddingVertical: 0,
    alignItems: 'center',
    // LiquidGlass handles background/border/shadow. Keep layout-only props here.
  },
  tab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    minHeight: sizing.minTouchTarget,
    borderRadius: borderRadius.full,
  },
  indicator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginTop: spacing[1],
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: colors.system.blue,
  },
});
