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
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { InteractionManager, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { RootNavigator } from '../navigation';
import { primeAppStorageCritical, warmAppStorageSession } from '../storage/prime';
import { perfNavigation, perfProbe } from '../perf';
import { installAccessibilityObservers } from '../system/accessibility';
import { AppThemeProvider, useAppTheme } from '../theme';
import { AppErrorBoundary } from './AppErrorBoundary';
import { AuthProvider } from '../cloud/auth/AuthContext';
import { markNavigationReady } from './splashScreen';

/** Migrations only at module scope — never block first paint on full-history warm. */
void primeAppStorageCritical().catch(() => {});

const gestureRootStyle = StyleSheet.create({ root: { flex: 1 } }).root;

void SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedStatusBar(): React.ReactElement {
  const { isDark, a11y } = useAppTheme();
  if (a11y.invertColors) {
    return <StatusBar style="light" />;
  }
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

/**
 * Aligns default stack/scene chrome with app grouped canvas so pushes and modals
 * don’t flash the wrong paper color between frames (especially on iOS).
 */
function AppNavigation(): React.ReactElement {
  const { groupedCanvas, isDark, system } = useAppTheme();
  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    const paper = groupedCanvas as string;
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
    markNavigationReady();
  }, []);

  return (
    <View style={[styles.navShell, { backgroundColor: groupedCanvas as string }]}>
      <NavigationContainer
        ref={perfNavigation.ref as any}
        onReady={onNavReady}
        onStateChange={perfNavigation.onStateChange}
        theme={navTheme}
      >
        <ThemedStatusBar />
        <RootNavigator />
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  navShell: { flex: 1 },
});

export function RootApp() {
  useEffect(() => {
    installAccessibilityObservers();
  }, []);

  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) return;
    const dbg = require('../dev/debugScenarios') as typeof import('../dev/debugScenarios');
    const fullDemoSeed = require('../data/storage/fullDemoSeed') as typeof import('../data/storage/fullDemoSeed');
    (globalThis as any).KairoDebug = {
      list: dbg.listDebugScenarios,
      run: dbg.runDebugScenario,
      runAll: dbg.runAllDebugScenarios,
      setChaos(config: any) {
        (globalThis as any).__KAIRO_CHAOS__ = config;
      },
    };
    (globalThis as any).KairoSeed = {
      rebuild: () => fullDemoSeed.runFullDemoRebuild(),
    };
    const vf = require('../dev/visualFixtures') as typeof import('../dev/visualFixtures');
    (globalThis as any).KairoVisualFixtures = {
      list: vf.listVisualFixtures,
      active: vf.activeVisualFixture,
      describe: vf.describeVisualFixture,
      enabled: vf.isVisualFixtureMode,
    };
    return () => {
      try {
        delete (globalThis as any).KairoDebug;
        delete (globalThis as any).KairoSeed;
        delete (globalThis as any).KairoVisualFixtures;
      } catch {
        (globalThis as any).KairoDebug = undefined;
        (globalThis as any).KairoSeed = undefined;
        (globalThis as any).KairoVisualFixtures = undefined;
      }
    };
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void warmAppStorageSession().catch(() => {});
      try {
        require('../navigation/CalendarStack');
        require('@features/journal/screens/JournalScreen');
      } catch {
        /* best-effort module preload — no navigation.preload() */
      }
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        perfProbe.logFirstInteractionReady({ stage: 'RootApp.afterInteractions' });
      }
    });
    return () => task.cancel();
  }, []);

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppThemeProvider>
          <GestureHandlerRootView style={gestureRootStyle}>
            <SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}>
              <AppNavigation />
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </AppThemeProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
