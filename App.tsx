/**
 * @fileoverview Moodly - Daily Mood Tracker
 * iOS-inspired design with floating navigation
 */

// Required by react-native-gesture-handler (safe in Expo).
import 'react-native-gesture-handler';

// Install production-safe, redacted console early.
import { installSafeConsole } from './src/security';
installSafeConsole();

// Dev-only perf probes (metadata-only logs; no behavior/UI changes).
import { initPerfProbe } from './src/perf';
initPerfProbe();

import React from 'react';
import { RootApp } from './src/app';

export default function App() {
  return <RootApp />;
}
