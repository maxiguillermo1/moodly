import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview Root application component (bootstrap + app wiring).
 * @module bootstrap/RootApp
 *
 * Beginner rule:
 * - Put global wiring here (providers, navigation container, startup tasks).
 * - Do NOT put screen UI here.
 *
 * Note: `App.tsx` remains the true entrypoint because it must install certain
 * safety hooks (e.g., safe console patch) as early as possible.
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme, DefaultTheme, } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InteractionManager, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from '../navigation';
import { primeAppStorage } from '../storage/prime';
import { perfNavigation, perfProbe } from '../perf';
import { installAccessibilityObservers } from '../system/accessibility';
import { AppThemeProvider, useAppTheme } from '../theme';
import { AppErrorBoundary } from './AppErrorBoundary';
import { AuthProvider } from '../cloud/auth/AuthContext';
/** Start migrations + session RAM as early as possible (coalesced with Auth + Today peek paths). */
void primeAppStorage().catch(() => { });
const gestureRootStyle = StyleSheet.create({ root: { flex: 1 } }).root;
void SplashScreen.preventAutoHideAsync().catch(() => { });
function ThemedStatusBar() {
    const { isDark, a11y } = useAppTheme();
    if (a11y.invertColors) {
        return _jsx(StatusBar, { style: "light" });
    }
    return _jsx(StatusBar, { style: isDark ? 'light' : 'dark' });
}
/**
 * Aligns default stack/scene chrome with app grouped canvas so pushes and modals
 * don’t flash the wrong paper color between frames (especially on iOS).
 */
function AppNavigation() {
    const { groupedCanvas, isDark, system } = useAppTheme();
    const navTheme = useMemo(() => {
        const base = isDark ? DarkTheme : DefaultTheme;
        const paper = groupedCanvas;
        return {
            ...base,
            colors: {
                ...base.colors,
                background: paper,
                card: paper,
                primary: system.blue,
                text: system.label,
                border: system.separator,
            },
        };
    }, [groupedCanvas, isDark, system.blue, system.label, system.separator]);
    const onNavReady = useCallback(() => {
        perfNavigation.onReady();
        void SplashScreen.hideAsync().catch(() => { });
    }, []);
    return (_jsx(View, { style: [styles.navShell, { backgroundColor: groupedCanvas }], children: _jsxs(NavigationContainer, { ref: perfNavigation.ref, onReady: onNavReady, onStateChange: perfNavigation.onStateChange, theme: navTheme, children: [_jsx(ThemedStatusBar, {}), _jsx(RootNavigator, {})] }) }));
}
const styles = StyleSheet.create({
    navShell: { flex: 1 },
});
export function RootApp() {
    const hideSplash = useCallback(() => {
        void SplashScreen.hideAsync().catch(() => { });
    }, []);
    useEffect(() => {
        // Install once; no UI changes.
        installAccessibilityObservers();
    }, []);
    useEffect(() => {
        if (typeof __DEV__ === 'undefined' || !__DEV__)
            return;
        // Dev-only debug harness (no UI changes). Trigger from Metro console:
        //   globalThis.KairoDebug.list()
        //   globalThis.KairoDebug.run('rapidMonthTaps')
        const dbg = require('../dev/debugScenarios');
        const fullDemoSeed = require('../data/storage/fullDemoSeed');
        globalThis.KairoDebug = {
            list: dbg.listDebugScenarios,
            run: dbg.runDebugScenario,
            runAll: dbg.runAllDebugScenarios,
            // Deterministic fault injection config for storage (dev-only).
            setChaos(config) {
                globalThis.__KAIRO_CHAOS__ = config;
            },
        };
        globalThis.KairoSeed = {
            /** Wipe local mood/goals/tasks/habits (not settings) and re-seed 2020→today. */
            rebuild: () => fullDemoSeed.runFullDemoRebuild(),
        };
        return () => {
            try {
                delete globalThis.KairoDebug;
                delete globalThis.KairoSeed;
            }
            catch {
                globalThis.KairoDebug = undefined;
                globalThis.KairoSeed = undefined;
            }
        };
    }, []);
    useEffect(() => {
        void primeAppStorage()
            .then(() => {
            InteractionManager.runAfterInteractions(() => {
                try {
                    require('../navigation/CalendarStack');
                    require('@features/journal/screens/JournalScreen');
                }
                catch {
                    /* best-effort preload */
                }
            });
        })
            .catch(() => { });
        if (typeof __DEV__ === 'undefined' || !__DEV__)
            return;
        const task = InteractionManager.runAfterInteractions(() => {
            perfProbe.logFirstInteractionReady({ stage: 'RootApp.afterInteractions' });
        });
        return () => task.cancel();
    }, []);
    return (_jsx(AppErrorBoundary, { children: _jsx(AuthProvider, { children: _jsx(AppThemeProvider, { children: _jsx(GestureHandlerRootView, { style: gestureRootStyle, onLayout: hideSplash, children: _jsx(SafeAreaProvider, { children: _jsx(AppNavigation, {}) }) }) }) }) }));
}
