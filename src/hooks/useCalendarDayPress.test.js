/**
 * @fileoverview Calendar day tap: immediate haptic before async entry load.
 * @module hooks/useCalendarDayPress.test
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCalendarDayPress } from './useCalendarDayPress';
const mockGetEntry = jest.fn();
jest.mock('../storage/entries', () => ({
    getEntry: (...a) => mockGetEntry(...a),
}));
const mockSelect = jest.fn();
jest.mock('../system/haptics', () => ({
    haptics: { select: () => mockSelect() },
}));
jest.mock('../perf', () => ({
    perfProbe: {
        enabled: false,
        nowMs: () => 0,
        setCulpritPhase: jest.fn(),
        measureSince: jest.fn(),
    },
}));
describe('useCalendarDayPress', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetEntry.mockResolvedValue(null);
    });
    it('fires selection haptic synchronously before awaiting storage', async () => {
        let resolveGet;
        mockGetEntry.mockImplementation(() => new Promise((r) => {
            resolveGet = r;
        }));
        const getEntryReqIdRef = { current: 0 };
        const setSelectedDate = jest.fn();
        const setEditMood = jest.fn();
        const setEditNote = jest.fn();
        const setIsEditOpen = jest.fn();
        const { result } = renderHook(() => useCalendarDayPress({
            getEntryReqIdRef,
            setSelectedDate,
            setEditMood,
            setEditNote,
            setIsEditOpen,
        }));
        let pressPromise;
        await act(async () => {
            pressPromise = result.current('2026-06-15');
        });
        expect(mockSelect).toHaveBeenCalledTimes(1);
        expect(setSelectedDate).toHaveBeenCalledWith('2026-06-15');
        await act(async () => {
            resolveGet(null);
            await pressPromise;
        });
        await waitFor(() => expect(setIsEditOpen).toHaveBeenCalledWith(true));
    });
});
