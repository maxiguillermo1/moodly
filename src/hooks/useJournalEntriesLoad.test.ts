/**
 * @module hooks/useJournalEntriesLoad.test
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useJournalEntriesLoad } from './useJournalEntriesLoad';

const mockSnapshot = jest.fn();
jest.mock('../storage', () => ({
  getJournalEntriesSortedDescSnapshot: (...args: unknown[]) => mockSnapshot(...args),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => (() => void) | void) => {
    cb();
  },
}));

jest.mock('../perf', () => ({
  perfProbe: { enabled: false, nowMs: () => 0, flushReport: jest.fn() },
}));

describe('useJournalEntriesLoad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSnapshot.mockResolvedValue([]);
  });

  it('loads entries on focus', async () => {
    const { result } = renderHook(() => useJournalEntriesLoad());
    await waitFor(() => expect(mockSnapshot).toHaveBeenCalled());
    expect(result.current.journalLoadCompleted).toBe(true);
    expect(result.current.entriesDesc).toEqual([]);
  });
});
