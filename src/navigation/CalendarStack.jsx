import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const Stack = createNativeStackNavigator();
export function CalendarStack() {
    const { a11y } = useAppTheme();
    return (_jsxs(Stack.Navigator, { screenOptions: {
            headerShown: false,
            gestureEnabled: true,
            animation: a11y.reduceMotion ? 'none' : 'slide_from_right',
            ...Platform.select({
                ios: { fullScreenGestureEnabled: true },
                default: {},
            }),
        }, children: [_jsx(Stack.Screen, { name: "CalendarScreen", component: CalendarScreen }), _jsx(Stack.Screen, { name: "CalendarView", component: CalendarView })] }));
}
