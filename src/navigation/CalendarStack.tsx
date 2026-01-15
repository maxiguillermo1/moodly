/**
 * @fileoverview Calendar stack navigator (Month view + Year grid view)
 * @module navigation/CalendarStack
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CalendarScreen from '../screens/CalendarScreen';
import CalendarView from '../screens/CalendarView';

export type CalendarStackParamList = {
  CalendarScreen: { year?: number; month?: number; date?: string } | undefined;
  CalendarView: { year?: number } | undefined;
};

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export function CalendarStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CalendarScreen" component={CalendarScreen} />
      <Stack.Screen name="CalendarView" component={CalendarView} />
    </Stack.Navigator>
  );
}

