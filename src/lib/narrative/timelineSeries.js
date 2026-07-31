/**
 * @fileoverview Rolling **fortnight buckets** for phase detection (local calendar).
 * @module lib/narrative/timelineSeries
 */
import { addLocalDays } from '../insights/periodBounds';
/** Classify a bucket using only structural ratios (deterministic). */
export function classifyPhase(metrics) {
    const { spanDays, activeDays, journalDays } = metrics;
    if (spanDays <= 0)
        return 'steady';
    const ratio = activeDays / spanDays;
    const jr = journalDays / spanDays;
    if (activeDays === 0)
        return 'sparse';
    if (ratio <= 0.18)
        return 'sparse';
    if (jr >= Math.max(0.32, 4 / spanDays))
        return 'reflective';
    if (ratio >= 0.52)
        return 'high_activity';
    if (ratio <= 0.26)
        return 'quiet';
    return 'steady';
}
function foldBucket(rows, start, end) {
    let activeDays = 0;
    let moodDays = 0;
    let journalDays = 0;
    let sumMoodRank = 0;
    let moodSamples = 0;
    let weekendActive = 0;
    let weekendTotal = 0;
    let weekdayActive = 0;
    let weekdayTotal = 0;
    const map = new Map(rows.map((r) => [r.date, r]));
    let spanDays = 0;
    let d = start;
    for (let g = 0; g < 32; g++) {
        spanDays += 1;
        const row = map.get(d);
        if (row) {
            if (row.hasActivity)
                activeDays += 1;
            if (row.moodPresent)
                moodDays += 1;
            if (row.moodRank != null) {
                sumMoodRank += row.moodRank;
                moodSamples += 1;
            }
            if (row.journalNote)
                journalDays += 1;
            if (row.isWeekend) {
                weekendTotal += 1;
                if (row.hasActivity)
                    weekendActive += 1;
            }
            else {
                weekdayTotal += 1;
                if (row.hasActivity)
                    weekdayActive += 1;
            }
        }
        if (d >= end)
            break;
        d = addLocalDays(d, 1);
    }
    return {
        spanDays,
        activeDays,
        moodDays,
        journalDays,
        sumMoodRank,
        moodSamples,
        weekendActive,
        weekendTotal,
        weekdayActive,
        weekdayTotal,
    };
}
const FORTNIGHT = 14;
/**
 * Partition `[windowStart, windowEnd]` into ~14-day buckets aligned at `windowStart`.
 */
export function buildFortnightBuckets(windowStart, windowEnd, rows) {
    const out = [];
    if (windowStart > windowEnd)
        return out;
    let segStart = windowStart;
    while (segStart <= windowEnd) {
        const segEnd = addLocalDays(segStart, FORTNIGHT - 1);
        const cappedEnd = segEnd > windowEnd ? windowEnd : segEnd;
        const folded = foldBucket(rows, segStart, cappedEnd);
        const phaseKind = classifyPhase(folded);
        out.push({
            start: segStart,
            end: cappedEnd,
            ...folded,
            phaseKind,
        });
        if (cappedEnd >= windowEnd)
            break;
        segStart = addLocalDays(cappedEnd, 1);
    }
    return out;
}
