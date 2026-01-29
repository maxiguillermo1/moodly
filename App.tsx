/**
 * @fileoverview Moodly - Daily Mood Tracker
 * iOS-inspired design with floating navigation
 */

// Required by react-native-gesture-handler (safe in Expo).
import 'react-native-gesture-handler';

// Install production-safe, redacted console early.
import { installSafeConsole } from './src/security';
installSafeConsole();

import React from 'react';
import { RootApp } from './src/app';

export default function App() {
  return <RootApp />;
}
