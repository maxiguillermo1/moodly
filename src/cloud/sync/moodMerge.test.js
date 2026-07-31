/**
 * @fileoverview Mood LWW merge unit tests.
 */
import { mergeMoodEntries } from './moodMerge';
function entry(date, mood, updatedAt) {
    return { date, mood, note: '', createdAt: 1, updatedAt };
}
describe('mergeMoodEntries', () => {
    it('keeps local-only dates for outbox push', () => {
        const local = { '2026-05-01': entry('2026-05-01', 'A', 100) };
        const merged = mergeMoodEntries(local, {});
        expect(merged['2026-05-01']?.mood).toBe('A');
    });
    it('applies cloud entry when local is missing', () => {
        const cloud = { '2026-05-02': entry('2026-05-02', 'B', 200) };
        const merged = mergeMoodEntries({}, cloud);
        expect(merged['2026-05-02']?.mood).toBe('B');
    });
    it('prefers newer updatedAt on conflict', () => {
        const local = { '2026-05-03': entry('2026-05-03', 'A', 100) };
        const cloud = { '2026-05-03': entry('2026-05-03', 'B', 200) };
        expect(mergeMoodEntries(local, cloud)['2026-05-03']?.mood).toBe('B');
    });
    it('keeps local when local is newer than cloud', () => {
        const local = { '2026-05-04': entry('2026-05-04', 'A', 300) };
        const cloud = { '2026-05-04': entry('2026-05-04', 'B', 200) };
        expect(mergeMoodEntries(local, cloud)['2026-05-04']?.mood).toBe('A');
    });
    it('cloud wins when updatedAt ties', () => {
        const local = { '2026-05-05': entry('2026-05-05', 'A', 150) };
        const cloud = { '2026-05-05': entry('2026-05-05', 'B', 150) };
        expect(mergeMoodEntries(local, cloud)['2026-05-05']?.mood).toBe('B');
    });
});
