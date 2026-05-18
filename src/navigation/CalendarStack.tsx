/**
 * @fileoverview Calendar stack navigator (Month view + Year grid view)
 * @module navigation/CalendarStack
 */

import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CalendarScreen from '@features/calendar/screens/CalendarScreen';
import CalendarView from '@features/calendar/screens/CalendarView';
import { useAppTheme } from '../theme';

export type CalendarStackParamList = {
  CalendarScreen: { year?: number; month?: number; date?: string } | undefined;
  CalendarView: { year?: number } | undefined;
};

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export function CalendarStack() {
  const { a11y } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: a11y.reduceMotion ? 'none' : 'slide_from_right',
        ...Platform.select({
          ios: { fullScreenGestureEnabled: true },
          default: {},
        }),
      }}
    >
      <Stack.Screen name="CalendarScreen" component={CalendarScreen} />
      <Stack.Screen name="CalendarView" component={CalendarView} />
    </Stack.Navigator>
  );
}

