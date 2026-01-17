/**
 * @fileoverview iOS-style floating tab bar (like iOS 18 search bubble)
 * @module navigation/FloatingTabBar
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, borderRadius, shadows } from '../theme';

const TAB_ICONS: Record<string, any> = {
  Calendar: 'calendar-outline',
  Today: 'sunny-outline',
  Journal: 'book-outline',
};

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
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
                size={22}
                color={isFocused ? colors.system.blue : colors.system.secondaryLabel}
              />
              <View style={[styles.indicator, isFocused && styles.indicatorActive]} />
            </TouchableOpacity>
          );
        })}
      </View>
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
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    ...shadows.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.system.separator,
  },
  tab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: spacing[1],
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: colors.system.blue,
  },
});
