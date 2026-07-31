/**
 * @module hooks/useJournalEntriesLoad.test
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { useJournalEntriesLoad } from './useJournalEntriesLoad';
const mockSnapshot = jest.fn();
const mockPeek = jest.fn();
const mockStorageState = { entriesEpoch: 0 };
jest.mock('../storage', () => ({
    getJournalEntriesSortedDescSnapshot: (...args) => mockSnapshot(...args),
    peekJournalEntriesSortedDescFromSessionCache: (...args) => mockPeek(...args),
    getEntriesSessionEpoch: () => mockStorageState.entriesEpoch,
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
    perfProbe: { enabled: false, nowMs: () => 0, flushReport: jest.fn() },
}));
describe('useJournalEntriesLoad', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockStorageState.entriesEpoch = 1;
        mockSnapshot.mockResolvedValue([]);
        mockPeek.mockReturnValue(undefined);
    });
    it('loads entries on focus', async () => {
        const { result } = renderHook(() => useJournalEntriesLoad());
        await waitFor(() => expect(mockSnapshot).toHaveBeenCalled());
        expect(result.current.journalLoadCompleted).toBe(true);
        expect(result.current.entriesDesc).toEqual([]);
    });
    it('skips reload when entries session epoch unchanged', async () => {
        const { result } = renderHook(() => useJournalEntriesLoad());
        await waitFor(() => expect(mockSnapshot).toHaveBeenCalledTimes(1));
        mockSnapshot.mockClear();
        await result.current.reload();
        expect(mockSnapshot).not.toHaveBeenCalled();
    });
    it('hydrates synchronously from session peek on focus (no spinner wait)', async () => {
        const peeked = [{ date: '2026-07-24', mood: 'A', note: '', createdAt: 1, updatedAt: 1 }];
        mockPeek.mockReturnValue(peeked);
        const { result } = renderHook(() => useJournalEntriesLoad());
        expect(result.current.journalLoadCompleted).toBe(true);
        expect(result.current.entriesDesc).toEqual(peeked);
        await waitFor(() => expect(mockSnapshot).toHaveBeenCalled());
    });
});
