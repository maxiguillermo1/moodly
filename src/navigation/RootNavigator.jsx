import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview Root navigation with floating tab bar + settings stack
 * @module navigation/RootNavigator
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TodayScreen from '@features/today/screens/TodayScreen';
import { FloatingTabBar } from './FloatingTabBar';
import { TabBarAutoHideProvider } from './TabBarAutoHideContext';
import { useAppTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import AccountLoginScreen from '@features/account/screens/AccountLoginScreen';
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const renderFloatingTabBar = (props) => _jsx(FloatingTabBar, { ...props });
/** Main tabs with floating nav bar */
function MainTabs() {
    return (_jsx(TabBarAutoHideProvider, { children: _jsxs(Tab.Navigator, { detachInactiveScreens: false, tabBar: renderFloatingTabBar, screenOptions: {
                headerShown: false,
                tabBarHideOnKeyboard: true,
                /** No cross-fade/shift between scenes — instant switch. */
                animation: 'none',
                /** Lazy mount: eager-mounting all tabs + native `activityState` caused blank/black first paint on some builds. */
                lazy: true,
                /** Keep tab roots live; FlashList thaw hitches were the reason freeze was disabled per-tab. */
                freezeOnBlur: false,
            }, initialRouteName: "Today", children: [_jsx(Tab.Screen, { name: "Calendar", getComponent: () => require('./CalendarStack').CalendarStack }), _jsx(Tab.Screen, { name: "Today", component: TodayScreen }), _jsx(Tab.Screen, { name: "Journal", getComponent: () => require('@features/journal/screens/JournalScreen').default })] }) }));
}
/** Root stack with settings modal */
function MainStackNavigator() {
    const { groupedCanvas, a11y } = useAppTheme();
    const modalAnimation = a11y.reduceMotion ? 'none' : 'slide_from_bottom';
    const pushAnimation = a11y.reduceMotion ? 'none' : 'slide_from_right';
    return (_jsxs(Stack.Navigator, { screenOptions: {
            headerShown: false,
            contentStyle: { backgroundColor: groupedCanvas },
        }, children: [_jsx(Stack.Screen, { name: "Main", component: MainTabs }), _jsx(Stack.Screen, { name: "Settings", getComponent: () => require('@features/settings/screens/SettingsScreen').default, options: {
                    presentation: 'modal',
                    animation: modalAnimation,
                } }), _jsx(Stack.Screen, { name: "Account", getComponent: () => require('@features/account/screens/AccountScreen').default, options: {
                    presentation: 'card',
                    animation: pushAnimation,
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true,
                } }), _jsx(Stack.Screen, { name: "Habits", getComponent: () => require('@features/habits/screens/HabitsScreen').default, options: {
                    presentation: 'card',
                    animation: pushAnimation,
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true,
                    animationTypeForReplace: 'push',
                } }), _jsx(Stack.Screen, { name: "Goals", getComponent: () => require('@features/goals/screens/GoalsScreen').default, options: {
                    presentation: 'card',
                    animation: pushAnimation,
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true,
                    animationTypeForReplace: 'push',
                } }), _jsx(Stack.Screen, { name: "Todo", getComponent: () => require('@features/reminders/screens/TodoScreen').default, options: {
                    presentation: 'card',
                    animation: pushAnimation,
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true,
                    animationTypeForReplace: 'push',
                } })] }));
}
function AuthBootstrapLoading({ label = 'Loading account' }) {
    const { groupedCanvas, system } = useAppTheme();
    return (_jsx(View, { style: [authGateStyles.loading, { backgroundColor: groupedCanvas }], children: _jsx(ActivityIndicator, { color: system.blue, accessibilityLabel: label }) }));
}
const authGateStyles = StyleSheet.create({
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
/** Shows login gate when cloud is enabled and user is signed out; otherwise main app. */
export default function RootNavigator() {
    const { cloudEnabled, initialized, restoring, user, localOnlyMode, settingsLoaded } = useAuth();
    if (cloudEnabled && !settingsLoaded) {
        return _jsx(AuthBootstrapLoading, { label: "Loading Kairo" });
    }
    if (cloudEnabled && !user && !localOnlyMode) {
        if (!initialized) {
            return _jsx(AuthBootstrapLoading, { label: "Loading sign in" });
        }
        return _jsx(AccountLoginScreen, {});
    }
    if (cloudEnabled && user && restoring) {
        return _jsx(AuthBootstrapLoading, { label: "Setting up your account" });
    }
    return _jsx(MainStackNavigator, {});
}
