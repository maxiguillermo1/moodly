/**
 * @fileoverview Continuity analyzer unit tests.
 * @module lib/narrative/continuityAnalyzer.test
 */
import { analyzeContinuity } from './continuityAnalyzer';
function row(i, journal) {
    return {
        date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
        hasActivity: true,
        moodPresent: false,
        moodRank: null,
        journalNote: journal,
        isWeekend: false,
    };
}
describe('continuityAnalyzer', () => {
    it('flags rebuild when the back half carries meaningfully more journal days', () => {
        const rows = [];
        for (let i = 0; i < 40; i++) {
            const firstHalf = i < 20;
            const journal = firstHalf ? i >= 18 : true;
            rows.push(row(i, journal));
        }
        const r = analyzeContinuity(rows);
        expect(r.firstJournalDays).toBe(2);
        expect(r.secondJournalDays).toBe(20);
        expect(r.journalRebuildSignal).toBe(true);
    });
    it('does not flag rebuild on short windows', () => {
        const rows = [row(0, false), row(1, true)];
        expect(analyzeContinuity(rows).journalRebuildSignal).toBe(false);
    });
});
