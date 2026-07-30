#!/usr/bin/env node
/**
 * Parse Metro / device logs for Kairo perf probe tab-switch metrics.
 *
 * Usage:
 *   EXPO_PUBLIC_KAIRO_PERF_PROBE=1 kairo
 *   # switch tabs in simulator, then:
 *   node scripts/measure-tab-perf.mjs [.runtime/logs/metro.log]
 *
 * Prints tap→focus p50/p95 and nav route-change counts.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

const logPath =
  process.argv[2] ||
  path.join(process.env.HOME || '', 'Desktop/Kairo/.runtime/logs/metro.log');

function parseDurations(lines, event) {
  const re = new RegExp(`"${event}"[^\\n]*"durationMs":(\\d+(?:\\.\\d+)?)`);
  const out = [];
  for (const line of lines) {
    const m = line.match(re);
    if (m) out.push(Number(m[1]));
  }
  return out;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

let raw = '';
try {
  raw = readFileSync(logPath, 'utf8');
} catch (e) {
  console.error(`Could not read log: ${logPath}`);
  console.error(String(e));
  process.exit(1);
}

const lines = raw.split('\n');
const tabPressToFocus = parseDurations(lines, 'perf.tabPressToFocus').sort((a, b) => a - b);
const navToFocus = parseDurations(lines, 'perf.navToFocus').sort((a, b) => a - b);
const routeChanges = lines.filter((l) => l.includes('perf.navRouteChange')).length;
const hitches = lines.filter((l) => l.includes('perf.hitch')).length;

console.log('Kairo tab-switch perf summary');
console.log('─────────────────────────────');
console.log(`Log: ${logPath}`);
console.log(`Tab route changes: ${routeChanges}`);
console.log(`perf.hitch events: ${hitches}`);
if (tabPressToFocus.length) {
  console.log(`tabPressToFocus samples: ${tabPressToFocus.length}`);
  console.log(`  p50: ${percentile(tabPressToFocus, 0.5).toFixed(1)} ms`);
  console.log(`  p95: ${percentile(tabPressToFocus, 0.95).toFixed(1)} ms`);
  console.log(`  max: ${tabPressToFocus[tabPressToFocus.length - 1].toFixed(1)} ms`);
} else {
  console.log('tabPressToFocus: no samples (enable EXPO_PUBLIC_KAIRO_PERF_PROBE=1)');
}
if (navToFocus.length) {
  console.log(`navToFocus samples: ${navToFocus.length}`);
  console.log(`  p50: ${percentile(navToFocus, 0.5).toFixed(1)} ms`);
  console.log(`  p95: ${percentile(navToFocus, 0.95).toFixed(1)} ms`);
}
