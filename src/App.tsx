/**
 * @fileoverview Kairo v0.6 — Daily Mood Tracker
 * iOS-inspired design with floating navigation
 */

// Required by react-native-gesture-handler (safe in Expo).
import 'react-native-gesture-handler';

// Install production-safe, redacted console early.
import { installSafeConsole } from './security';
installSafeConsole();

// Dev-only perf probes (opt-in): RAF hitch loop adds measurable JS overhead on Simulator.
if (
  typeof __DEV__ !== 'undefined' &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_KAIRO_PERF_PROBE === '1'
) {
  queueMicrotask(() => {
    require('./perf').initPerfProbe();
  });
}

import React from 'react';
import { RootApp } from './bootstrap/index';

export default function App() {
  return <RootApp />;
}
