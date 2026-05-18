/**
 * @fileoverview Root navigation with floating tab bar + settings stack
 * @module navigation/RootNavigator
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  TodayScreen,
  JournalScreen,
  SettingsScreen,
  HabitsScreen,
  GoalsScreen,
  TodoScreen,
} from '../screens';
import { FloatingTabBar } from './FloatingTabBar';
import { TabBarAutoHideProvider } from './TabBarAutoHideContext';
import { CalendarStack } from './CalendarStack';
import { useAppTheme } from '../theme';

import type { RootStackParamList } from './types';

// Type definitions
export type MainTabParamList = {
  Calendar: undefined;
  Today: undefined;
  Journal: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const renderFloatingTabBar = (props: BottomTabBarProps) => <FloatingTabBar {...props} />;

/** Main tabs with floating nav bar */
function MainTabs() {
  return (
    <TabBarAutoHideProvider>
      <Tab.Navigator
        detachInactiveScreens={false}
        tabBar={renderFloatingTabBar}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          /** No cross-fade/shift between scenes — instant switch. */
          animation: 'none',
          /** Lazy mount: eager-mounting all tabs + native `activityState` caused blank/black first paint on some builds. */
          lazy: true,
          /** Keep tab roots live; FlashList thaw hitches were the reason freeze was disabled per-tab. */
          freezeOnBlur: false,
        }}
        initialRouteName="Today"
      >
        <Tab.Screen name="Calendar" component={CalendarStack} />
        <Tab.Screen name="Today" component={TodayScreen} />
        {/* FlashList can hitch when thawing frozen screens; keep Journal live for smoother tab return */}
        <Tab.Screen name="Journal" component={JournalScreen} />
      </Tab.Navigator>
    </TabBarAutoHideProvider>
  );
}

/** Root stack with settings modal */
export default function RootNavigator() {
  const { groupedCanvas, a11y } = useAppTheme();
  const modalAnimation = a11y.reduceMotion ? 'none' : 'slide_from_bottom';
  const pushAnimation = a11y.reduceMotion ? 'none' : 'slide_from_right';
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: groupedCanvas },
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          presentation: 'modal',
          animation: modalAnimation,
        }}
      />
      <Stack.Screen
        name="Habits"
        component={HabitsScreen}
        options={{
          presentation: 'card',
          animation: pushAnimation,
          gestureEnabled: true,
          // iOS: full-width edge swipe to dismiss (feels native after replacing the settings modal).
          fullScreenGestureEnabled: true,
          animationTypeForReplace: 'push',
        }}
      />
      <Stack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          presentation: 'card',
          animation: pushAnimation,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animationTypeForReplace: 'push',
        }}
      />
      <Stack.Screen
        name="Todo"
        component={TodoScreen}
        options={{
          presentation: 'card',
          animation: pushAnimation,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animationTypeForReplace: 'push',
        }}
      />
    </Stack.Navigator>
  );
}
