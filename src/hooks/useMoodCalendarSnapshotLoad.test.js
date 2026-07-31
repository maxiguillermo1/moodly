/**
 * @module hooks/useMoodCalendarSnapshotLoad.test
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { useMoodCalendarSnapshotLoad } from './useMoodCalendarSnapshotLoad';
const mockFetch = jest.fn();
const mockPeek = jest.fn();
const mockEpoch = jest.fn(() => ({ entries: 1, settings: 1 }));
jest.mock('../storage/calendar', () => ({
    fetchMoodCalendarSnapshot: (...args) => mockFetch(...args),
    getMoodCalendarSnapshotEpoch: () => mockEpoch(),
    peekMoodCalendarSnapshotFromWarmCache: (...args) => mockPeek(...args),
}));
jest.mock('@react-navigation/native', () => {
    const React = require('react');
    return {
        useFocusEffect: (cb) => {
            React.useEffect(() => {
                const cleanup = cb();
                return cleanup;
            }, [cb]);
        },
    };
});
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
        mockEpoch.mockReturnValue({ entries: 1, settings: 1 });
        mockPeek.mockReturnValue(undefined);
        mockFetch.mockResolvedValue({
            byMonthKey: { '2026-05': {} },
            calendarMoodStyle: 'fill',
        });
    });
    it('loads snapshot on focus and exposes state', async () => {
        const { result } = renderHook(() => useMoodCalendarSnapshotLoad({
            screen: 'TestCalendar',
            loadPerfEvent: 'calendar.loadData',
            todayKey: '2026-05-19',
        }));
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalled();
        });
        await waitFor(() => {
            expect(result.current.entriesByMonthKey).toEqual({ '2026-05': {} });
        });
        expect(result.current.calendarMoodStyle).toBe('fill');
    });
    it('hydrates synchronously from session peek on focus', async () => {
        mockPeek.mockReturnValue({
            byMonthKey: { '2026-06': {} },
            calendarMoodStyle: 'outline',
        });
        const { result } = renderHook(() => useMoodCalendarSnapshotLoad({
            screen: 'TestCalendar',
            loadPerfEvent: 'calendar.loadData',
            todayKey: '2026-06-01',
        }));
        expect(result.current.entriesByMonthKey).toEqual({ '2026-06': {} });
        expect(result.current.calendarMoodStyle).toBe('outline');
        await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    });
    it('calls onTodayKeyChangeWhileFocused when todayKey changes while focused', async () => {
        const onToday = jest.fn();
        const { rerender } = renderHook(({ todayKey }) => useMoodCalendarSnapshotLoad({
            screen: 'TestCalendar',
            loadPerfEvent: 'calendar.loadData',
            todayKey,
            onTodayKeyChangeWhileFocused: onToday,
        }), { initialProps: { todayKey: '2026-05-18' } });
        await waitFor(() => expect(mockFetch).toHaveBeenCalled());
        onToday.mockClear();
        rerender({ todayKey: '2026-05-19' });
        expect(onToday).toHaveBeenCalled();
    });
    it('skips fetch when snapshot epoch unchanged on reload', async () => {
        const { result } = renderHook(() => useMoodCalendarSnapshotLoad({
            screen: 'TestCalendar',
            loadPerfEvent: 'calendar.loadData',
            todayKey: '2026-05-19',
        }));
        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
        mockFetch.mockClear();
        await result.current.reload();
        expect(mockFetch).not.toHaveBeenCalled();
    });
});
