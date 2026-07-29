import type { MoodEntry, MoodGrade } from '../../types';
import { getMonthRenderModel } from '../../components/calendar/monthModel';

describe('getMonthRenderModel', () => {
  const emptyEntries: Record<string, MoodEntry> = {};

  it('maps mood entry to correct day', () => {
    const entries: Record<string, MoodEntry> = {
      '2026-05-12': { date: '2026-05-12', mood: 'A' as MoodGrade, note: '', createdAt: 0, updatedAt: 0 },
    };
    const m = getMonthRenderModel({
      year: 2026,
      monthIndex0: 4,
      variant: 'full',
      calendarMoodStyle: 'dot',
      monthEntries: entries,
      entriesRevision: 1,
      todayIso: '2026-05-01',
      selectedDate: '2026-05-12',
    });
    expect(m.moodGradeByDay[12]).toBe('A');
    expect(m.selectedDay).toBe(12);
  });

  it('selectedDay and todayDay are 0 when keys are other months', () => {
    const m = getMonthRenderModel({
      year: 2026,
      monthIndex0: 4,
      variant: 'full',
      calendarMoodStyle: 'dot',
      monthEntries: emptyEntries,
      entriesRevision: 0,
      todayIso: '2026-06-01',
      selectedDate: '2026-07-15',
    });
    expect(m.todayDay).toBe(0);
    expect(m.selectedDay).toBe(0);
  });

  it('returns same model reference for identical cache key (perf contract)', () => {
    const m1 = getMonthRenderModel({
      year: 2024,
      monthIndex0: 1,
      variant: 'mini',
      calendarMoodStyle: 'dot',
      monthEntries: emptyEntries,
      entriesRevision: 0,
      todayIso: '2024-02-15',
    });
    const m2 = getMonthRenderModel({
      year: 2024,
      monthIndex0: 1,
      variant: 'mini',
      calendarMoodStyle: 'dot',
      monthEntries: emptyEntries,
      entriesRevision: 0,
      todayIso: '2024-02-15',
    });
    expect(m1).toBe(m2);
  });

  it('handles large month map without throwing', () => {
    const monthEntries: Record<string, MoodEntry> = {};
    for (let d = 1; d <= 28; d++) {
      const key = `2030-02-${String(d).padStart(2, '0')}`;
      monthEntries[key] = {
        date: key,
        mood: 'B',
        note: 'x',
        createdAt: 0,
        updatedAt: 0,
      };
    }
    const m = getMonthRenderModel({
      year: 2030,
      monthIndex0: 1,
      variant: 'full',
      calendarMoodStyle: 'fill',
      monthEntries,
      entriesRevision: 99,
      todayIso: '2030-02-01',
    });
    expect(m.moodGradeByDay[28]).toBe('B');
  });

  it('precomputes accessibility labels when month is pressable', () => {
    const onPressDate = jest.fn();
    const m = getMonthRenderModel({
      year: 2026,
      monthIndex0: 4,
      variant: 'full',
      calendarMoodStyle: 'dot',
      monthEntries: emptyEntries,
      entriesRevision: 0,
      todayIso: '2026-05-12',
      selectedDate: '2026-05-12',
      onPressDate,
    });
    expect(m.a11yLabelByDay[12]).toContain('Selected');
    expect(m.a11yLabelByDay[12]).toContain('Today');
  });
});
