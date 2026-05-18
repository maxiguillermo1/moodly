/**
 * @fileoverview **Phase detection** — wraps fortnight segmentation + structural labels.
 * @module lib/narrative/phaseDetection
 */

import type { LocalDateKey } from '../../types/dailyActivity.types';
import type { DaySignalRow } from './daySignals';
import { buildFortnightBuckets, classifyPhase, type FortnightBucket } from './timelineSeries';

export type { FortnightBucket };

export { classifyPhase };

/**
 * Ordered fortnight buckets covering the window (aligned at `windowStart`).
 */
export function detectPhaseBuckets(
  windowStart: LocalDateKey,
  windowEnd: LocalDateKey,
  rows: readonly DaySignalRow[]
): FortnightBucket[] {
  return buildFortnightBuckets(windowStart, windowEnd, rows);
}
