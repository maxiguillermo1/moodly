/**
 * @fileoverview **Milestones** — longest journal note streak in-window (structural).
 * @module lib/narrative/milestoneEngine
 */
import { longestStreakOverSortedDates } from '../insights/trendCalculators';
export function longestJournalNoteStreak(rows) {
    const dates = rows.map((r) => r.date);
    const set = new Set(rows.filter((r) => r.journalNote).map((r) => r.date));
    return longestStreakOverSortedDates(dates, (d) => set.has(d));
}
export function journalStreakMilestoneEligible(longest, windowDays) {
    return windowDays >= 28 && longest >= 10;
}
