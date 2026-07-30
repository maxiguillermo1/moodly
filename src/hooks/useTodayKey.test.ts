/**
 * @fileoverview useTodayKey — midnight rollover and foreground resync.
 */

import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useTodayKey } from './useTodayKey';
import { toLocalDayKey } from '../utils';

type AppStateHandler = (state: string) => void;

describe('useTodayKey', () => {
  let appStateHandlers: AppStateHandler[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 30, 12, 0, 0)); // 2026-07-30 noon local
    appStateHandlers = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
      appStateHandlers.push(handler as AppStateHandler);
      return { remove: jest.fn() } as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('returns current local day key on mount', () => {
    const { result } = renderHook(() => useTodayKey());
    expect(result.current.todayKey).toBe('2026-07-30');
    expect(result.current.todayKeyRef.current).toBe('2026-07-30');
  });

  it('updates at local midnight', () => {
    jest.setSystemTime(new Date(2026, 6, 30, 23, 59, 50));
    const { result } = renderHook(() => useTodayKey());

    expect(result.current.todayKey).toBe('2026-07-30');

    act(() => {
      jest.advanceTimersByTime(15_000);
    });

    expect(result.current.todayKey).toBe('2026-07-31');
  });

  it('resyncs when app returns to foreground after midnight', () => {
    const { result } = renderHook(() => useTodayKey());
    expect(result.current.todayKey).toBe('2026-07-30');

    jest.setSystemTime(new Date(2026, 6, 31, 8, 0, 0));

    act(() => {
      for (const handler of appStateHandlers) handler('active');
    });

    expect(result.current.todayKey).toBe('2026-07-31');
  });

  it('does not rerender when foreground resync sees the same key', () => {
    const { result } = renderHook(() => useTodayKey());
    const keyBefore = result.current.todayKey;

    act(() => {
      for (const handler of appStateHandlers) handler('active');
    });

    expect(result.current.todayKey).toBe(keyBefore);
    expect(result.current.todayKey).toBe(toLocalDayKey(new Date()));
  });
});
