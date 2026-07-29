jest.mock('./moodStorage', () => ({
  getCalendarEntriesByMonthIndexSnapshot: jest.fn(),
  getEntriesSessionEpoch: jest.fn(() => 1),
}));

jest.mock('./settingsStorage', () => ({
  getSettings: jest.fn(),
  getSettingsSessionEpoch: jest.fn(() => 1),
}));

import {
  fetchMoodCalendarSnapshot,
  invalidateMoodCalendarSnapshotWarmCacheForTests,
  peekMoodCalendarSnapshotFromWarmCache,
} from './calendarSnapshot';
import type { AppSettings } from '../../types/settings.types';

const { getCalendarEntriesByMonthIndexSnapshot, getEntriesSessionEpoch } = require('./moodStorage') as {
  getCalendarEntriesByMonthIndexSnapshot: jest.Mock;
  getEntriesSessionEpoch: jest.Mock;
};
const { getSettings, getSettingsSessionEpoch } = require('./settingsStorage') as {
  getSettings: jest.Mock;
  getSettingsSessionEpoch: jest.Mock;
};

const baseSettings: AppSettings = {
  appearance: 'system',
  calendarMoodStyle: 'fill',
  moodGradeColorStyle: 'solid',
  habitsEnabled: false,
  todayGoalsEnabled: false,
  todayTodoEnabled: false,
  todayExtensionsOrder: ['habits', 'goals', 'todo'],
};

describe('fetchMoodCalendarSnapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateMoodCalendarSnapshotWarmCacheForTests();
    getEntriesSessionEpoch.mockReturnValue(1);
    getSettingsSessionEpoch.mockReturnValue(1);
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

    invalidateMoodCalendarSnapshotWarmCacheForTests();
    await fetchMoodCalendarSnapshot();
    expect(getCalendarEntriesByMonthIndexSnapshot).toHaveBeenCalledTimes(2);
    expect(getSettings).toHaveBeenCalledTimes(2);
  });

  it('returns warm RAM snapshot when session epochs unchanged', async () => {
    getCalendarEntriesByMonthIndexSnapshot.mockResolvedValue({});
    getSettings.mockResolvedValue(baseSettings);

    await fetchMoodCalendarSnapshot();
    expect(getCalendarEntriesByMonthIndexSnapshot).toHaveBeenCalledTimes(1);

    await fetchMoodCalendarSnapshot();
    expect(getCalendarEntriesByMonthIndexSnapshot).toHaveBeenCalledTimes(1);
    expect(getSettings).toHaveBeenCalledTimes(1);
  });

  it('refetches when entries session epoch changes', async () => {
    getCalendarEntriesByMonthIndexSnapshot.mockResolvedValue({});
    getSettings.mockResolvedValue(baseSettings);

    await fetchMoodCalendarSnapshot();
    getEntriesSessionEpoch.mockReturnValue(2);
    await fetchMoodCalendarSnapshot();

    expect(getCalendarEntriesByMonthIndexSnapshot).toHaveBeenCalledTimes(2);
    expect(getSettings).toHaveBeenCalledTimes(2);
  });
});

describe('peekMoodCalendarSnapshotFromWarmCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateMoodCalendarSnapshotWarmCacheForTests();
    getEntriesSessionEpoch.mockReturnValue(1);
    getSettingsSessionEpoch.mockReturnValue(1);
  });

  it('returns undefined before warm cache is built', () => {
    expect(peekMoodCalendarSnapshotFromWarmCache()).toBeUndefined();
  });

  it('returns warm snapshot after fetch without extra IO', async () => {
    getCalendarEntriesByMonthIndexSnapshot.mockResolvedValue({ '2026-01': {} });
    getSettings.mockResolvedValue(baseSettings);

    await fetchMoodCalendarSnapshot();
    const peeked = peekMoodCalendarSnapshotFromWarmCache();
    expect(peeked?.byMonthKey).toEqual({ '2026-01': {} });
    expect(peeked?.calendarMoodStyle).toBe('fill');
  });
});
