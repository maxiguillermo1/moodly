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
      <Stack.Screen
        name="CalendarScreen"
        component={CalendarScreen}
        // Important: force a new instance when navigating to a different month/year,
        // so CalendarScreen can safely lazy-init its anchor date exactly once (no flicker).
        getId={({ params }) =>
          typeof params?.year === 'number' && typeof params?.month === 'number'
            ? `ym:${params.year}-${params.month}`
            : 'root'
        }
      />
      <Stack.Screen
        name="CalendarView"
        component={CalendarView}
        // Keep Year view responsive when coming from different visible years.
        getId={({ params }) => (typeof params?.year === 'number' ? `y:${params.year}` : 'root')}
      />
    </Stack.Navigator>
  );
}

