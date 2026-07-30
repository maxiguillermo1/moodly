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
import { useAuth } from '../hooks/useAuth';
import AccountLoginScreen from '@features/account/screens/AccountLoginScreen';

import type { RootStackParamList, MainTabParamList } from './types';

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
          tabBarStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            height: 0,
            elevation: 0,
            zIndex: 0,
          },
          sceneStyle: {
            backgroundColor: 'transparent',
          },
          animation: 'none',
          lazy: true,
          freezeOnBlur: true,
        }}
        initialRouteName="Today"
      >
        <Tab.Screen
          name="Calendar"
          getComponent={() => require('./CalendarStack').CalendarStack}
          options={{ freezeOnBlur: false }}
        />
        <Tab.Screen name="Today" component={TodayScreen} />
        <Tab.Screen
          name="Journal"
          getComponent={() => require('@features/journal/screens/JournalScreen').default}
          options={{ freezeOnBlur: false }}
        />
      </Tab.Navigator>
    </TabBarAutoHideProvider>
  );
}

/** Root stack with settings modal */
function MainStackNavigator() {
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

/**
 * Local shell renders immediately. Login gate only after auth SDK resolves session
 * (never blocks cold start on network, settings load, or cloud restore).
 */
export default function RootNavigator() {
  const { cloudEnabled, initialized, user, localOnlyMode } = useAuth();

  if (cloudEnabled && initialized && !user && !localOnlyMode) {
    return <AccountLoginScreen />;
  }

  return <MainStackNavigator />;
}
