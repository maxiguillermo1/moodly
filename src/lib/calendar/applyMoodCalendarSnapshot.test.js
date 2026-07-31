import { applyMoodCalendarSnapshot } from './applyMoodCalendarSnapshot';
function applyEntries(entries, updater) {
    return typeof updater === 'function' ? updater(entries) : updater;
}
describe('applyMoodCalendarSnapshot', () => {
    it('bumps revision and reports mutation when month map changes', () => {
        const entriesRevisionRef = { current: 0 };
        let entries = {};
        let style = 'dot';
        const onMutated = jest.fn();
        const mutated = applyMoodCalendarSnapshot({
            snapshot: {
                byMonthKey: { '2026-05': { '2026-05-01': {} } },
                calendarMoodStyle: 'fill',
            },
            setEntriesByMonthKey: (updater) => {
                entries = applyEntries(entries, updater);
            },
            setCalendarMoodStyle: (updater) => {
                style = typeof updater === 'function' ? updater(style) : updater;
            },
            entriesRevisionRef,
            onMutated,
        });
        expect(mutated).toBe(true);
        expect(entriesRevisionRef.current).toBe(1);
        expect(style).toBe('fill');
        expect(onMutated).toHaveBeenCalledTimes(1);
    });
    it('is a no-op when references are unchanged', () => {
        const byMonthKey = { '2026-05': {} };
        const entriesRevisionRef = { current: 3 };
        let entries = byMonthKey;
        let style = 'dot';
        const mutated = applyMoodCalendarSnapshot({
            snapshot: { byMonthKey, calendarMoodStyle: 'dot' },
            setEntriesByMonthKey: (updater) => {
                entries = applyEntries(entries, updater);
            },
            setCalendarMoodStyle: (updater) => {
                style = typeof updater === 'function' ? updater(style) : updater;
            },
            entriesRevisionRef,
        });
        expect(mutated).toBe(false);
        expect(entriesRevisionRef.current).toBe(3);
        expect(entries).toBe(byMonthKey);
        expect(style).toBe('dot');
    });
});
