/**
 * @fileoverview Synthetic multi-year mood entry fixtures + cold-load profiling helpers.
 * @module qa/entriesScaleHarness
 *
 * Used by Jest benchmarks to establish AsyncStorage vs SQLite thresholds (1k / 5k / 10k rows).
 * Does not import UI or React.
 */

import type { MoodEntriesRecord, MoodGrade } from '../types';

/** Scale tiers referenced in docs/PERFORMANCE_BENCHMARKS.md. */
export const ENTRIES_SCALE_THRESHOLDS = [1000, 5000, 10000] as const;

export type EntriesScaleThreshold = (typeof ENTRIES_SCALE_THRESHOLDS)[number];

const MOODS: readonly MoodGrade[] = ['A+', 'A', 'B', 'C', 'D', 'F'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(year: number, month1: number): number {
  if (month1 === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month1)) return 30;
  return 31;
}

/**
 * Deterministic local `YYYY-MM-DD` keys spanning multiple years (one entry per day).
 */
export function generateSyntheticMoodEntries(count: number, startYear = 2016): MoodEntriesRecord {
  const safeCount = Math.max(0, Math.floor(count));
  if (safeCount === 0) return {};

  const out: MoodEntriesRecord = {};
  let year = startYear;
  let month = 1;
  let day = 1;
  const baseTs = Date.UTC(startYear, 0, 1);

  for (let i = 0; i < safeCount; i += 1) {
    const date = `${year}-${pad2(month)}-${pad2(day)}`;
    const ts = baseTs + i * 86_400_000;
    out[date] = {
      date,
      mood: MOODS[i % MOODS.length]!,
      note: `Synthetic journal note ${i} (${date})`,
      createdAt: ts,
      updatedAt: ts,
    };

    day += 1;
    const dim = daysInMonth(year, month);
    if (day > dim) {
      day = 1;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }

  return out;
}

export type ColdLoadBenchmarkResult = {
  entryCount: number;
  coldLoadMs: number;
  payloadApproxBytes: number;
};

/**
 * Measure cold-load latency after resetting session caches (simulates app relaunch RAM miss).
 */
export async function benchmarkColdEntriesLoad(options: {
  entryCount: number;
  seedAsyncStorage: (record: MoodEntriesRecord) => Promise<void>;
  resetSession: () => void;
  load: () => Promise<unknown>;
}): Promise<ColdLoadBenchmarkResult> {
  const record = generateSyntheticMoodEntries(options.entryCount);
  await options.seedAsyncStorage(record);
  options.resetSession();

  const started = Date.now();
  await options.load();
  const coldLoadMs = Date.now() - started;

  return {
    entryCount: options.entryCount,
    coldLoadMs,
    payloadApproxBytes: JSON.stringify(record).length,
  };
}

/** Dev/Jest helper: summarize whether a tier exceeds a soft ms budget. */
export function exceedsSoftColdLoadBudget(coldLoadMs: number, entryCount: EntriesScaleThreshold): boolean {
  if (entryCount <= 1000) return coldLoadMs > 250;
  if (entryCount <= 5000) return coldLoadMs > 750;
  return coldLoadMs > 1500;
}
