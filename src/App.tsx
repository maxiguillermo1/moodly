/**
 * @fileoverview Moodly v0.5 — Daily Mood Tracker
 * iOS-inspired design with floating navigation
 */

// Required by react-native-gesture-handler (safe in Expo).
import 'react-native-gesture-handler';

// Install production-safe, redacted console early.
import { installSafeConsole } from './security';
installSafeConsole();

// Dev-only perf probes (metadata-only logs; no behavior/UI changes).
// Production hygiene: do not even initialize probe modules in prod bundles.
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  require('./perf').initPerfProbe();
}

import React from 'react';
import { RootApp } from './app/index';

export default function App() {
  return <RootApp />;
}
