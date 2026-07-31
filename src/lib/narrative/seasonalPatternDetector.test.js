/**
 * @fileoverview Weekend vs weekday rhythm tests.
 * @module lib/narrative/seasonalPatternDetector.test
 */
import { detectWeekendWeekdayRhythm } from './seasonalPatternDetector';
describe('seasonalPatternDetector', () => {
    it('detects weekend-leaning activity with enough coverage', () => {
        const rows = [];
        for (let i = 0; i < 40; i++) {
            const isWeekend = i % 7 === 0 || i % 7 === 6;
            rows.push({
                date: `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
                hasActivity: isWeekend ? true : i % 9 === 0,
                moodPresent: false,
                moodRank: null,
                journalNote: false,
                isWeekend,
            });
        }
        const r = detectWeekendWeekdayRhythm(rows);
        expect(r.notableWeekendLean).toBe(true);
    });
});
