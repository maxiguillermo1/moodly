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
import { colors } from '../theme';

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
      }}
      initialRouteName="Today"
    >
      <Tab.Screen name="Calendar" component={CalendarStack} />
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Journal" component={JournalScreen} />
    </Tab.Navigator>
  );
}

/** Root stack with settings modal */
export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.system.background },
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
