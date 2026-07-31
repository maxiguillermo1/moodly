/**
 * @fileoverview **Phase detection** — wraps fortnight segmentation + structural labels.
 * @module lib/narrative/phaseDetection
 */
import { buildFortnightBuckets, classifyPhase } from './timelineSeries';
export { classifyPhase };
/**
 * Ordered fortnight buckets covering the window (aligned at `windowStart`).
 */
export function detectPhaseBuckets(windowStart, windowEnd, rows) {
    return buildFortnightBuckets(windowStart, windowEnd, rows);
}
