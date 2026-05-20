/**
 * @fileoverview Root navigation with floating tab bar + settings stack
 * @module navigation/RootNavigator
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import TodayScreen from '@features/today/screens/TodayScreen';
import { FloatingTabBar } from './FloatingTabBar';
import { TabBarAutoHideProvider } from './TabBarAutoHideContext';
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
        <Tab.Screen
          name="Calendar"
          getComponent={() => require('./CalendarStack').CalendarStack}
        />
        <Tab.Screen name="Today" component={TodayScreen} />
        <Tab.Screen
          name="Journal"
          getComponent={() => require('@features/journal/screens/JournalScreen').default}
        />
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
        getComponent={() => require('@features/settings/screens/SettingsScreen').default}
        options={{
          presentation: 'modal',
          animation: modalAnimation,
        }}
      />
      <Stack.Screen
        name="Account"
        getComponent={() => require('@features/account/screens/AccountScreen').default}
        options={{
          presentation: 'card',
          animation: pushAnimation,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="Habits"
        getComponent={() => require('@features/habits/screens/HabitsScreen').default}
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
        getComponent={() => require('@features/goals/screens/GoalsScreen').default}
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
        getComponent={() => require('@features/reminders/screens/TodoScreen').default}
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
