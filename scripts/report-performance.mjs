#!/usr/bin/env node
/**
 * Parse Metro logs and emit a structured performance report.
 *
 * Usage:
 *   EXPO_PUBLIC_KAIRO_PERF_PROBE=1 kairo perf
 *   # exercise tab switches, then:
 *   npm run perf:report
 *   node scripts/report-performance.mjs [.runtime/logs/metro.log] [--save]
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const logPath =
  process.argv.find((a) => !a.startsWith('-') && a.endsWith('.log')) ||
  path.join(process.env.HOME || '', 'Desktop/Kairo/.runtime/logs/metro.log');
const saveBaseline = process.argv.includes('--save');

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

function stats(samples) {
  if (!samples.length) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    n: sorted.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted[sorted.length - 1],
  };
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
const events = {
  tabPressToFocus: stats(parseDurations(lines, 'perf.tabPressToFocus')),
  navToFocus: stats(parseDurations(lines, 'perf.navToFocus')),
  navDispatchLatency: stats(parseDurations(lines, 'perf.navDispatchLatency')),
  screenInteractionReady: stats(parseDurations(lines, 'perf.screenInteractionReady')),
};
const routeChanges = lines.filter((l) => l.includes('perf.navRouteChange')).length;
const hitches = lines.filter((l) => l.includes('perf.hitch')).length;
const reports = lines.filter((l) => l.includes('perf.report')).length;

const report = {
  generatedAt: new Date().toISOString(),
  logPath,
  routeChanges,
  hitches,
  perfReports: reports,
  events,
};

console.log('Kairo performance report');
console.log('════════════════════════');
console.log(`Log: ${logPath}`);
console.log(`Route changes: ${routeChanges}`);
console.log(`Hitch events: ${hitches}`);
console.log(`perf.report flushes: ${reports}`);
console.log('');

for (const [name, s] of Object.entries(events)) {
  if (!s) {
    console.log(`${name}: no samples`);
    continue;
  }
  console.log(`${name} (n=${s.n})`);
  console.log(`  p50: ${s.p50.toFixed(1)} ms`);
  console.log(`  p95: ${s.p95.toFixed(1)} ms`);
  console.log(`  max: ${s.max.toFixed(1)} ms`);
}

if (!events.tabPressToFocus) {
  console.log('');
  console.log('Tip: enable probes with EXPO_PUBLIC_KAIRO_PERF_PROBE=1 kairo perf');
}

if (saveBaseline) {
  const outDir = path.join(path.dirname(logPath), '..', 'perf', 'baseline');
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'latest.json');
  writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log('');
  console.log(`Baseline saved: ${outFile}`);
}
