/**
 * @fileoverview One IO round-trip for calendar surfaces: mood index + display settings.
 * @module data/storage/calendarSnapshot
 */
import { getCalendarEntriesByMonthIndexSnapshot, getEntriesSessionEpoch, peekCalendarEntriesByMonthIndexFromSessionCache, } from './moodStorage';
import { getSettings, getSettingsSessionEpoch, peekSettingsCache } from './settingsStorage';
/** @internal Coalesce overlapping reads (rapid tab switches / month + year). */
let moodCalendarSnapshotInflight = null;
/** Warm RAM snapshot — invalidated when entries or settings session epochs change. */
let moodCalendarSnapshotWarm = null;
let moodCalendarSnapshotWarmEpoch = null;
export function getMoodCalendarSnapshotEpoch() {
    return {
        entries: getEntriesSessionEpoch(),
        settings: getSettingsSessionEpoch(),
    };
}
function moodCalendarSnapshotEpochsEqual(a, b) {
    return a.entries === b.entries && a.settings === b.settings;
}
/** Drop warm calendar snapshot (tests / import reset). */
export function invalidateMoodCalendarSnapshotWarmCacheForTests() {
    moodCalendarSnapshotWarm = null;
    moodCalendarSnapshotWarmEpoch = null;
    moodCalendarSnapshotInflight = null;
}
/**
 * Sync read when warm RAM snapshot matches current session epochs.
 * Returns `undefined` when not ready — caller should fall back to async fetch.
 */
export function peekMoodCalendarSnapshotFromWarmCache() {
    const epoch = getMoodCalendarSnapshotEpoch();
    if (moodCalendarSnapshotWarm &&
        moodCalendarSnapshotWarmEpoch &&
        moodCalendarSnapshotEpochsEqual(epoch, moodCalendarSnapshotWarmEpoch)) {
        return moodCalendarSnapshotWarm;
    }
    return undefined;
}
/**
 * Build warm calendar snapshot when entries + settings are already in RAM (no disk I/O).
 * Safe to call from post-interaction idle hooks after `primeEntriesSessionCache`.
 */
export function warmMoodCalendarSnapshotCacheIfPrimed() {
    const byMonthKey = peekCalendarEntriesByMonthIndexFromSessionCache();
    const settings = peekSettingsCache();
    if (!byMonthKey || !settings)
        return;
    moodCalendarSnapshotWarm = {
        byMonthKey: byMonthKey,
        calendarMoodStyle: settings.calendarMoodStyle,
    };
    moodCalendarSnapshotWarmEpoch = getMoodCalendarSnapshotEpoch();
}
export async function fetchMoodCalendarSnapshot() {
    const epoch = getMoodCalendarSnapshotEpoch();
    if (moodCalendarSnapshotWarm &&
        moodCalendarSnapshotWarmEpoch &&
        moodCalendarSnapshotEpochsEqual(epoch, moodCalendarSnapshotWarmEpoch)) {
        return moodCalendarSnapshotWarm;
    }
    if (moodCalendarSnapshotInflight)
        return moodCalendarSnapshotInflight;
    moodCalendarSnapshotInflight = (async () => {
        try {
            const [byMonthKey, settings] = await Promise.all([
                getCalendarEntriesByMonthIndexSnapshot(),
                getSettings(),
            ]);
            const snapshot = {
                byMonthKey: byMonthKey,
                calendarMoodStyle: settings.calendarMoodStyle,
            };
            moodCalendarSnapshotWarm = snapshot;
            moodCalendarSnapshotWarmEpoch = getMoodCalendarSnapshotEpoch();
            return snapshot;
        }
        finally {
            moodCalendarSnapshotInflight = null;
        }
    })();
    return moodCalendarSnapshotInflight;
}
