/**
 * @fileoverview Session-level RAM-backed warmup for persisted data.
 * @module data/storage/sessionStore
 *
 * Purpose:
 * - Prime in-memory caches after first paint so screens feel instant on first open
 * - Provide dev-only diagnostics (metadata-only; never logs notes or payload blobs)
 */

import { logger } from '../../lib/security/logger';
import { warmEntriesSessionCaches, getEntriesSessionCacheDiagnostics } from './moodStorage';
import { getSettings } from './settingsStorage';

export async function warmSessionStore(): Promise<void> {
  // Parallel warmup (AsyncStorage is still the durability source of truth).
  await Promise.all([warmEntriesSessionCaches(), getSettings()]);
}

export function logSessionStoreDiagnostics(opts?: { totalMs?: number }): void {
  const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
  if (!IS_DEV) return;

  const d = getEntriesSessionCacheDiagnostics();
  const derived: string[] = [];
  if (d.hasSorted) derived.push('sorted');
  if (d.hasByMonth) derived.push('byMonth');
  if (d.hasMoodCounts) derived.push('counts');
  if (d.hasMonthDateKeys) derived.push('monthDateKeys');
  if (d.hasYearIndex) derived.push('yearIndex');

  logger.cache('session.ready', {
    entries: d.entriesCount,
    months: d.monthsIndexed,
    years: d.yearsIndexed,
    derived,
    source: d.lastAllEntriesSource,
    totalMs: typeof opts?.totalMs === 'number' ? opts.totalMs : undefined,
  });
}

