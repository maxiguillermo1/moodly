/**
 * @fileoverview useMoodEntry: load/save wiring against storage façade.
 * @module hooks/useMoodEntry.test
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useMoodEntry } from './useMoodEntry';

const mockGetEntry = jest.fn();
const mockUpsertEntry = jest.fn();
const mockCreateEntry = jest.fn();

jest.mock('../storage', () => ({
  getEntry: (...a: unknown[]) => mockGetEntry(...a),
  upsertEntry: (...a: unknown[]) => mockUpsertEntry(...a),
  createEntry: (...a: unknown[]) => mockCreateEntry(...a),
}));

jest.mock('../security', () => ({
  logger: { warn: jest.fn(), perf: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

describe('useMoodEntry', () => {
  const day = '2026-06-15';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEntry.mockResolvedValue(null);
    mockUpsertEntry.mockResolvedValue(undefined);
    mockCreateEntry.mockImplementation((date: string, mood: string, note: string) => ({
      date,
      mood,
      note,
      createdAt: 1,
      updatedAt: 1,
    }));
  });

  it('load hydrates mood and note from getEntry', async () => {
    mockGetEntry.mockResolvedValueOnce({
      date: day,
      mood: 'A',
      note: 'hello',
      createdAt: 1,
      updatedAt: 2,
    });
    const { result } = renderHook(() => useMoodEntry({ date: day }));

    await act(async () => {
      await result.current.load();
    });

    await waitFor(() => {
      expect(result.current.mood).toBe('A');
      expect(result.current.note).toBe('hello');
      expect(result.current.isExisting).toBe(true);
    });
  });

  it('load swallows storage errors without throwing', async () => {
    mockGetEntry.mockRejectedValueOnce(new Error('io'));
    const { result } = renderHook(() => useMoodEntry({ date: day }));

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.mood).toBeNull();
    expect(result.current.note).toBe('');
  });
});
