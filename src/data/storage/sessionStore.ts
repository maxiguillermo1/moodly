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

export function logSessionStoreDiagnostics(): void {
  const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
  if (!IS_DEV) return;

  const d = getEntriesSessionCacheDiagnostics();
  logger.debug('[sessionStore] cache diagnostics', {
    entriesCount: d.entriesCount,
    monthsIndexed: d.monthsIndexed,
    yearsIndexed: d.yearsIndexed,
    hasByMonth: d.hasByMonth,
    hasSorted: d.hasSorted,
    hasMoodCounts: d.hasMoodCounts,
    hasMonthDateKeys: d.hasMonthDateKeys,
    hasYearIndex: d.hasYearIndex,
  });
}

