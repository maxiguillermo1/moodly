import { buildMonthSections, buildMoodSections, buildWeekdaySections, entriesSameForJournal, nextMoodSoloFromHeaderTap, } from './journalSections';
import { scanJournalEntryPresence } from './journalEntryPresence';
function entry(date, mood = 'B') {
    return { date, mood, note: '', createdAt: 1, updatedAt: 1 };
}
/** Newest-first fixture (matches storage snapshot ordering). */
const SAMPLE = [
    entry('2026-05-03', 'A'),
    entry('2026-05-02', 'F'),
    entry('2026-04-15', 'B'),
];
describe('journalSections', () => {
    it('entriesSameForJournal compares semantic fields', () => {
        expect(entriesSameForJournal(SAMPLE, SAMPLE)).toBe(true);
        const mutated = [{ ...SAMPLE[0], note: 'x' }, ...SAMPLE.slice(1)];
        expect(entriesSameForJournal(SAMPLE, mutated)).toBe(false);
    });
    it('buildMonthSections preserves newest-first within month without re-sorting rows', () => {
        const sections = buildMonthSections(SAMPLE);
        const may = sections.find((s) => s.monthKey === '2026-05');
        expect(may?.data.map((e) => e.date)).toEqual(['2026-05-03', '2026-05-02']);
    });
    it('buildMoodSections buckets in MOOD_GRADES order', () => {
        const sections = buildMoodSections(SAMPLE);
        expect(sections.map((s) => s.moodGrade)).toEqual(['A', 'B', 'F']);
    });
    it('scanJournalEntryPresence is one pass', () => {
        const p = scanJournalEntryPresence(SAMPLE);
        expect(p.moodsWithEntries).toEqual(['A', 'B', 'F']);
        expect(p.monthKeysWithEntries).toEqual(['2026-05', '2026-04']);
        expect(p.monthKeysSet.has('2026-05')).toBe(true);
    });
    it('nextMoodSoloFromHeaderTap matches first-tap A+ behavior', () => {
        const p = scanJournalEntryPresence(SAMPLE);
        expect(nextMoodSoloFromHeaderTap('B', null, p.moodsWithEntries)).toBe('A+');
    });
    it('buildWeekdaySections assigns Monday-first buckets', () => {
        const sections = buildWeekdaySections([entry('2026-05-04')]); // Monday (local)
        expect(sections.some((s) => s.weekdayIndex0 === 0 && s.data.length === 1)).toBe(true);
    });
});
