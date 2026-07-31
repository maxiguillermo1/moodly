/**
 * @fileoverview Single-pass indices for journal grouped headers (solo cycling, validation).
 * @module lib/journal/journalEntryPresence
 */
import { MOOD_GRADES } from '../constants/moods';
import { monthKeyFromLocalDayKey } from '../utils/dateKeys';
import { parseISODate } from '../utils/date';
import { compareLocalDayKeysDesc } from '../utils/dateKeys';
/** Monday = 0 … Sunday = 6 (ISO-style week starting Monday). */
export const JOURNAL_WEEKDAY_SECTION_ORDER = [0, 1, 2, 3, 4, 5, 6];
export function mondayFirstWeekdayIndex0FromDayKey(dayKey) {
    const d = parseISODate(dayKey);
    if (Number.isNaN(d.getTime()))
        return null;
    const sun0 = d.getDay();
    return (sun0 + 6) % 7;
}
export const EMPTY_JOURNAL_ENTRY_PRESENCE = {
    moodsWithEntries: [],
    weekdaysWithEntries: [],
    monthKeysWithEntries: [],
    monthKeysSet: new Set(),
    weekdaySet: new Set(),
};
/**
 * O(n) scan — replaces repeated `build*Sections` + `.some` / `.filter` on header taps.
 * `entries` should already be newest-first (storage snapshot); order does not affect sets.
 */
export function scanJournalEntryPresence(entries) {
    const moodSet = new Set();
    const weekdaySet = new Set();
    const monthSet = new Set();
    for (let i = 0; i < entries.length; i += 1) {
        const e = entries[i];
        moodSet.add(e.mood);
        const w = mondayFirstWeekdayIndex0FromDayKey(e.date);
        if (w !== null)
            weekdaySet.add(w);
        monthSet.add(monthKeyFromLocalDayKey(e.date));
    }
    const moodsWithEntries = MOOD_GRADES.filter((g) => moodSet.has(g));
    const weekdaysWithEntries = JOURNAL_WEEKDAY_SECTION_ORDER.filter((w) => weekdaySet.has(w));
    const monthKeysWithEntries = [...monthSet].sort(compareLocalDayKeysDesc);
    return {
        moodsWithEntries,
        weekdaysWithEntries,
        monthKeysWithEntries,
        monthKeysSet: monthSet,
        weekdaySet,
    };
}
