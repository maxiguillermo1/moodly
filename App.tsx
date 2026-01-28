/**
 * @fileoverview Moodly - Daily Mood Tracker
 * iOS-inspired design with floating navigation
 */

// Required by react-native-gesture-handler (safe in Expo).
import 'react-native-gesture-handler';

// Install production-safe, redacted console early.
import { installSafeConsole } from './src/lib/logging/patchConsole';
installSafeConsole();

import React from 'react';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InteractionManager } from 'react-native';
import { RootNavigator } from './src/navigation';
import { seedDemoEntriesIfEmpty } from './src/data';
import { logger } from './src/lib/security/logger';

export default function App() {
  useEffect(() => {
    // Seed demo data for 2024–2025 if storage is empty (safe: won't overwrite real data).
    const task = InteractionManager.runAfterInteractions(() => {
      seedDemoEntriesIfEmpty().catch((_e) => {
        logger.warn('[seedDemoEntriesIfEmpty] failed');
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
