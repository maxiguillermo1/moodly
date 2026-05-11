/**
 * @fileoverview Root navigation with floating tab bar + settings stack
 * @module navigation/RootNavigator
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  TodayScreen,
  JournalScreen,
  SettingsScreen,
} from '../screens';
import { FloatingTabBar } from './FloatingTabBar';
import { CalendarStack } from './CalendarStack';
import { useAppTheme } from '../theme';

// Type definitions
export type MainTabParamList = {
  Calendar: undefined;
  Today: undefined;
  Journal: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

/** Main tabs with floating nav bar */
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Inactive tabs skip React reconciliation while off-screen (react-native-screens).
        freezeOnBlur: true,
      }}
      initialRouteName="Today"
    >
      <Tab.Screen name="Calendar" component={CalendarStack} />
      <Tab.Screen name="Today" component={TodayScreen} />
      {/* FlashList can hitch when thawing frozen screens; keep Journal live for smoother tab return */}
      <Tab.Screen name="Journal" component={JournalScreen} options={{ freezeOnBlur: false }} />
    </Tab.Navigator>
  );
}

/** Root stack with settings modal */
export default function RootNavigator() {
  const { system } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: system.background },
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}
