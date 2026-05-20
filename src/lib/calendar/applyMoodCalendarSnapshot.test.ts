import type { SetStateAction } from 'react';
import type { MoodEntry } from '../../types';
import { applyMoodCalendarSnapshot } from './applyMoodCalendarSnapshot';

type EntriesMap = Record<string, Record<string, MoodEntry>>;

function applyEntries(
  entries: EntriesMap,
  updater: SetStateAction<EntriesMap>
): EntriesMap {
  return typeof updater === 'function' ? updater(entries) : updater;
}

describe('applyMoodCalendarSnapshot', () => {
  it('bumps revision and reports mutation when month map changes', () => {
    const entriesRevisionRef = { current: 0 };
    let entries: EntriesMap = {};
    let style: 'dot' | 'fill' = 'dot';
    const onMutated = jest.fn();

    const mutated = applyMoodCalendarSnapshot({
      snapshot: {
        byMonthKey: { '2026-05': { '2026-05-01': {} as MoodEntry } },
        calendarMoodStyle: 'fill',
      },
      setEntriesByMonthKey: (updater: SetStateAction<EntriesMap>) => {
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
    const byMonthKey: EntriesMap = { '2026-05': {} };
    const entriesRevisionRef = { current: 3 };
    let entries: EntriesMap = byMonthKey;
    let style: 'dot' | 'fill' = 'dot';

    const mutated = applyMoodCalendarSnapshot({
      snapshot: { byMonthKey, calendarMoodStyle: 'dot' },
      setEntriesByMonthKey: (updater: SetStateAction<EntriesMap>) => {
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
