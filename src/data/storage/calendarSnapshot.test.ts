jest.mock('./moodStorage', () => ({
  getCalendarEntriesByMonthIndexSnapshot: jest.fn(),
}));

jest.mock('./settingsStorage', () => ({
  getSettings: jest.fn(),
}));

import { fetchMoodCalendarSnapshot } from './calendarSnapshot';
import type { AppSettings } from '../../types/settings.types';

const { getCalendarEntriesByMonthIndexSnapshot } = require('./moodStorage') as {
  getCalendarEntriesByMonthIndexSnapshot: jest.Mock;
};
const { getSettings } = require('./settingsStorage') as { getSettings: jest.Mock };

const baseSettings: AppSettings = {
  appearance: 'system',
  calendarMoodStyle: 'dot',
  moodGradeColorStyle: 'solid',
  habitsEnabled: false,
  todayGoalsEnabled: false,
  todayTodoEnabled: false,
  todayExtensionsOrder: ['habits', 'goals', 'todo'],
};

describe('fetchMoodCalendarSnapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads month index and settings in parallel and merges fields', async () => {
    const entry = {
      date: '2026-01-15',
      mood: 'A' as const,
      note: '',
      createdAt: 1,
      updatedAt: 1,
    };
    const order: string[] = [];

    getCalendarEntriesByMonthIndexSnapshot.mockImplementation(async () => {
      order.push('entries');
      await new Promise((r) => setTimeout(r, 15));
      return { '2026-01': { '2026-01-15': entry } };
    });

    getSettings.mockImplementation(async () => {
      order.push('settings');
      await new Promise((r) => setTimeout(r, 15));
      return { ...baseSettings, calendarMoodStyle: 'fill' };
    });

    const snap = await fetchMoodCalendarSnapshot();

    expect(order.sort()).toEqual(['entries', 'settings']);
    expect(snap.calendarMoodStyle).toBe('fill');
    expect(snap.byMonthKey['2026-01']?.['2026-01-15']?.mood).toBe('A');
  });

  it('coalesces concurrent snapshot requests into one storage round-trip', async () => {
    getCalendarEntriesByMonthIndexSnapshot.mockResolvedValue({});
    getSettings.mockResolvedValue(baseSettings);

    const p1 = fetchMoodCalendarSnapshot();
    const p2 = fetchMoodCalendarSnapshot();
    expect(getCalendarEntriesByMonthIndexSnapshot).toHaveBeenCalledTimes(1);
    expect(getSettings).toHaveBeenCalledTimes(1);
    await Promise.all([p1, p2]);

    await fetchMoodCalendarSnapshot();
    expect(getCalendarEntriesByMonthIndexSnapshot).toHaveBeenCalledTimes(2);
    expect(getSettings).toHaveBeenCalledTimes(2);
  });
});
