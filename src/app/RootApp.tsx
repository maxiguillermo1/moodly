/**
 * @fileoverview Root application component (bootstrap + app wiring).
 * @module app/RootApp
 *
 * Beginner rule:
 * - Put global wiring here (providers, navigation container, startup tasks).
 * - Do NOT put screen UI here.
 *
 * Note: `App.tsx` remains the true entrypoint because it must install certain
 * safety hooks (e.g., safe console patch) as early as possible.
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InteractionManager } from 'react-native';

import { RootNavigator } from '../navigation';
import { seedDemoEntriesIfEmpty, warmSessionStore, logSessionStoreDiagnostics } from '../storage';
import { logger } from '../security';
import { perfNavigation, perfProbe } from '../perf';

export function RootApp() {
  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) return;
    // Dev-only debug harness (no UI changes). Trigger from Metro console:
    //   globalThis.MoodlyDebug.list()
    //   globalThis.MoodlyDebug.run('rapidMonthTaps')
    const dbg = require('../dev/debugScenarios') as typeof import('../dev/debugScenarios');
    (globalThis as any).MoodlyDebug = {
      list: dbg.listDebugScenarios,
      run: dbg.runDebugScenario,
      runAll: dbg.runAllDebugScenarios,
      // Deterministic fault injection config for storage (dev-only).
      setChaos(config: any) {
        (globalThis as any).__MOODLY_CHAOS__ = config;
      },
    };
    return () => {
      try {
        delete (globalThis as any).MoodlyDebug;
      } catch {
        (globalThis as any).MoodlyDebug = undefined;
      }
    };
  }, []);

  useEffect(() => {
    // Dev-only seed. Deferred to avoid blocking first paint / nav transitions.
    const task = InteractionManager.runAfterInteractions(() => {
      // Approximate "first interaction readiness" (dev-only, metadata-only).
      // This fires after initial RN interactions/animations settle.
      perfProbe.logFirstInteractionReady({ stage: 'RootApp.afterInteractions' });

      // Seed first (dev-only), then warm RAM-backed caches so screens feel instant.
      seedDemoEntriesIfEmpty()
        .catch((_e) => {
          logger.warn('app.demoSeed.failed');
        })
        .finally(() => {
          const p: any = (globalThis as any).performance;
          const start = typeof p?.now === 'function' ? p.now() : Date.now();
          warmSessionStore()
            .then(() => {
              const end = typeof p?.now === 'function' ? p.now() : Date.now();
              const durationMs = Number(((end as number) - (start as number)).toFixed(1));
              logger.perf('session.warm', { phase: 'cold', source: 'storage', durationMs });
              logSessionStoreDiagnostics({ totalMs: durationMs });
            })
            .catch((_e) => {
              // Non-fatal: this only affects perceived performance, not correctness.
              logger.warn('session.warm.failed');
            });
        });
    });
    return () => task.cancel();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        // Dev-only observers: do NOT mutate nav state; metadata-only perf logs.
        ref={perfNavigation.ref as any}
        onReady={perfNavigation.onReady}
        onStateChange={perfNavigation.onStateChange}
      >
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

