/**
 * @fileoverview Session-level RAM-backed warmup for persisted data.
 * @module data/storage/sessionStore
 *
 * Purpose:
 * - Prime in-memory caches after first paint so screens feel instant on first open
 * - Provide dev-only diagnostics (metadata-only; never logs notes or payload blobs)
 */
import { logger } from '../../lib/security/logger';
import { primeEntriesSessionCache, warmJournalSortedDescCacheIfPrimed, getEntriesSessionCacheDiagnostics, } from './moodStorage';
import { warmMoodCalendarSnapshotCacheIfPrimed } from './calendarSnapshot';
import { getSettings } from './settingsStorage';
import { getGoals } from './goalsStorage';
import { getTrackedHabitIds } from './habitTrackingStorage';
import { getHabitSelectionsRecordSnapshot } from './habitSelectionsStorage';
import { warmDayTodosCacheIfPrimed } from './tasksStorage';
import { getToday } from '../../lib/utils/date';
export async function warmSessionStore() {
    const today = getToday();
    // Light warm: entries, settings, goals, habits, tasks. Derived views prebuilt in RAM so tab switches are instant.
    await Promise.all([
        primeEntriesSessionCache(),
        getSettings(),
        getGoals(),
        getTrackedHabitIds(),
        getHabitSelectionsRecordSnapshot(),
    ]);
    warmJournalSortedDescCacheIfPrimed();
    warmMoodCalendarSnapshotCacheIfPrimed();
    warmDayTodosCacheIfPrimed(today);
}
export function logSessionStoreDiagnostics(opts) {
    const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
    if (!IS_DEV)
        return;
    const d = getEntriesSessionCacheDiagnostics();
    const derived = [];
    if (d.hasSorted)
        derived.push('sorted');
    if (d.hasByMonth)
        derived.push('byMonth');
    if (d.hasMoodCounts)
        derived.push('counts');
    if (d.hasMonthDateKeys)
        derived.push('monthDateKeys');
    if (d.hasYearIndex)
        derived.push('yearIndex');
    logger.cache('session.ready', {
        entries: d.entriesCount,
        months: d.monthsIndexed,
        years: d.yearsIndexed,
        derived,
        source: d.lastAllEntriesSource,
        totalMs: typeof opts?.totalMs === 'number' ? opts.totalMs : undefined,
    });
}
