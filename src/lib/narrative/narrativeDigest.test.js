/**
 * @fileoverview Narrative digest determinism.
 * @module lib/narrative/narrativeDigest.test
 */
import { computeNarrativeDigest } from './narrativeDigest';
describe('narrativeDigest', () => {
    it('is stable for the same structural inputs', () => {
        const w = { start: '2026-01-01', end: '2026-01-28' };
        const chapters = [
            { phaseKind: 'steady', spanDays: 14, activeDays: 7 },
            { phaseKind: 'quiet', spanDays: 14, activeDays: 3 },
        ];
        const a = computeNarrativeDigest(w, chapters, { activeDays: 10, journalDays: 2, moodDays: 8 });
        const b = computeNarrativeDigest(w, chapters, { activeDays: 10, journalDays: 2, moodDays: 8 });
        expect(a).toBe(b);
        expect(a.startsWith('nar1.')).toBe(true);
    });
});
