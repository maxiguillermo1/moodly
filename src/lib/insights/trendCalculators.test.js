/**
 * @fileoverview Unit tests for `trendCalculators` (deterministic streaks).
 * @module lib/insights/trendCalculators.test
 */
import { countDays, longestStreakOverSortedDates, maxMoodLoggingStreak } from './trendCalculators';
function moodRow(date, hasEntry) {
    return {
        date,
        mood: { present: hasEntry, grade: hasEntry ? 'B' : null, hasEntry },
        journal: { present: false, notePreview: '', updatedAt: null },
        habits: { selectedIds: [], trackedIds: [] },
        goals: { items: [] },
        reminders: { items: [] },
        calendar: { monthKey: date.slice(0, 7), hasMoodEntry: hasEntry, moodGrade: hasEntry ? 'B' : null },
        summary: {
            counts: { mood: hasEntry ? 1 : 0, journalNote: 0, habits: 0, goalsWithProgress: 0, reminders: 0 },
            hasAnyActivity: hasEntry,
        },
        metadata: { composedAt: 1, date, warnings: [] },
    };
}
describe('trendCalculators', () => {
    it('counts days matching predicate', () => {
        const map = {
            '2026-06-01': moodRow('2026-06-01', true),
            '2026-06-02': moodRow('2026-06-02', false),
        };
        expect(countDays(map, (r) => r.mood.hasEntry)).toBe(1);
    });
    it('computes longest streak over sorted dates', () => {
        const keys = ['2026-06-01', '2026-06-02', '2026-06-04', '2026-06-05'];
        const pred = (d) => d === '2026-06-01' || d === '2026-06-02' || d === '2026-06-04';
        expect(longestStreakOverSortedDates(keys, pred)).toBe(2);
    });
    it('maxMoodLoggingStreak respects consecutive local days', () => {
        const map = {
            '2026-06-01': moodRow('2026-06-01', true),
            '2026-06-02': moodRow('2026-06-02', true),
            '2026-06-03': moodRow('2026-06-03', true),
            '2026-06-05': moodRow('2026-06-05', true),
        };
        expect(maxMoodLoggingStreak(map)).toBe(3);
    });
});
