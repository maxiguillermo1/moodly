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

export function RootApp() {
  useEffect(() => {
    // Dev-only seed. Deferred to avoid blocking first paint / nav transitions.
    const task = InteractionManager.runAfterInteractions(() => {
      // Seed first (dev-only), then warm RAM-backed caches so screens feel instant.
      seedDemoEntriesIfEmpty()
        .catch((_e) => {
          logger.warn('[seedDemoEntriesIfEmpty] failed');
        })
        .finally(() => {
          warmSessionStore()
            .then(() => logSessionStoreDiagnostics())
            .catch((_e) => {
              // Non-fatal: this only affects perceived performance, not correctness.
              logger.warn('[warmSessionStore] failed');
            });
        });
    });
    return () => task.cancel();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

