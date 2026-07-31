/**
 * @fileoverview Per-day **structural signals** for narrative math (no journal text).
 * @module lib/narrative/daySignals
 */
import { addLocalDays } from '../insights/periodBounds';
import { moodGradeRank } from '../insights/moodOrdinal';
import { isValidLocalCalendarDayKey, parseISODate } from '../utils/date';
function isWeekendKey(date) {
    const d = parseISODate(date);
    if (!Number.isFinite(d.getTime()))
        return false;
    const dow = d.getDay();
    return dow === 0 || dow === 6;
}
export function daySignalFromActivity(date, row) {
    if (!row) {
        return {
            date,
            hasActivity: false,
            moodPresent: false,
            moodRank: null,
            journalNote: false,
            isWeekend: isWeekendKey(date),
        };
    }
    const moodPresent = row.mood.present && row.mood.grade != null;
    const rank = moodPresent ? moodGradeRank(row.mood.grade) : null;
    return {
        date,
        hasActivity: row.summary.hasAnyActivity,
        moodPresent,
        moodRank: rank,
        journalNote: row.summary.counts.journalNote > 0,
        isWeekend: isWeekendKey(date),
    };
}
export function buildSortedDaySignals(windowStart, windowEnd, activities) {
    const out = [];
    if (!isValidLocalCalendarDayKey(windowStart) || !isValidLocalCalendarDayKey(windowEnd) || windowStart > windowEnd) {
        return out;
    }
    let d = windowStart;
    for (let guard = 0; guard < 5000; guard++) {
        out.push(daySignalFromActivity(d, activities[d]));
        if (d >= windowEnd)
            break;
        d = addLocalDays(d, 1);
    }
    return out;
}
