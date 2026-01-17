/**
 * @fileoverview Moodly - Daily Mood Tracker
 * iOS-inspired design with floating navigation
 */

// Required by react-native-gesture-handler (safe in Expo).
import 'react-native-gesture-handler';

import React from 'react';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation';
import { seedDemoEntriesIfEmpty } from './src/lib/storage';

export default function App() {
  useEffect(() => {
    // Seed demo data for 2024–2025 if storage is empty (safe: won't overwrite real data).
    seedDemoEntriesIfEmpty();
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
