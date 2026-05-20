/**
 * @module hooks/useMoodCalendarSnapshotLoad.test
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useMoodCalendarSnapshotLoad } from './useMoodCalendarSnapshotLoad';

const mockFetch = jest.fn();
jest.mock('../storage/calendar', () => ({
  fetchMoodCalendarSnapshot: (...args: unknown[]) => mockFetch(...args),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => (() => void) | void) => {
    const cleanup = cb();
    return cleanup;
  },
}));

jest.mock('../perf', () => ({
  perfProbe: {
    enabled: false,
    nowMs: () => 0,
    setCulpritPhase: jest.fn(),
    screenSessionStart: jest.fn(),
    flushReport: jest.fn(),
  },
}));

describe('useMoodCalendarSnapshotLoad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      byMonthKey: { '2026-05': {} },
      calendarMoodStyle: 'dot',
    });
  });

  it('loads snapshot on focus and exposes state', async () => {
    const { result } = renderHook(() =>
      useMoodCalendarSnapshotLoad({
        screen: 'TestCalendar',
        loadPerfEvent: 'calendar.loadData',
        todayKey: '2026-05-19',
      })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    expect(result.current.entriesByMonthKey).toEqual({ '2026-05': {} });
    expect(result.current.calendarMoodStyle).toBe('dot');
  });

  it('calls onTodayKeyChangeWhileFocused when todayKey changes while focused', async () => {
    const onToday = jest.fn();
    const { rerender } = renderHook(
      ({ todayKey }: { todayKey: string }) =>
        useMoodCalendarSnapshotLoad({
          screen: 'TestCalendar',
          loadPerfEvent: 'calendar.loadData',
          todayKey,
          onTodayKeyChangeWhileFocused: onToday,
        }),
      { initialProps: { todayKey: '2026-05-18' } }
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    onToday.mockClear();

    rerender({ todayKey: '2026-05-19' });
    expect(onToday).toHaveBeenCalled();
  });
});
