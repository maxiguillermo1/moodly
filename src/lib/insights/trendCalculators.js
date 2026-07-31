/**
 * @fileoverview Deterministic streak / density calculators over `DayActivity` maps.
 * @module lib/insights/trendCalculators
 */
import { parseISODate } from '../utils/date';
function dayDiff(a, b) {
    const da = parseISODate(a);
    const db = parseISODate(b);
    if (!Number.isFinite(da.getTime()) || !Number.isFinite(db.getTime()))
        return null;
    return Math.round((db.getTime() - da.getTime()) / 86400000);
}
function sortedKeys(map) {
    return Object.keys(map).sort();
}
/** Longest run of consecutive local days where predicate holds (keys must be contiguous dates). */
export function longestStreakOverSortedDates(sortedDates, pred) {
    let best = 0;
    let cur = 0;
    let prev = null;
    for (const d of sortedDates) {
        const ok = pred(d);
        if (!ok) {
            cur = 0;
            prev = d;
            continue;
        }
        if (prev == null) {
            cur = 1;
        }
        else {
            const diff = dayDiff(prev, d);
            cur = diff === 1 ? cur + 1 : 1;
        }
        best = Math.max(best, cur);
        prev = d;
    }
    return best;
}
export function maxMoodLoggingStreak(activities) {
    const keys = sortedKeys(activities);
    return longestStreakOverSortedDates(keys, (d) => {
        const row = activities[d];
        return !!row?.mood.hasEntry;
    });
}
export function countDays(activities, pred) {
    let n = 0;
    for (const k of Object.keys(activities)) {
        if (pred(activities[k]))
            n += 1;
    }
    return n;
}
