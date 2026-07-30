/**
 * @fileoverview useTopSafeInset — cold-start fallback for status bar clearance.
 */

import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

const mockUseSafeAreaInsets = jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockUseSafeAreaInsets(),
  initialWindowMetrics: { insets: { top: 59, bottom: 34, left: 0, right: 0 } },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { statusBarHeight: 54 },
}));

import { useTopSafeInset } from './useTopSafeInset';

describe('useTopSafeInset', () => {
  beforeEach(() => {
    mockUseSafeAreaInsets.mockReturnValue({ top: 0, bottom: 0, left: 0, right: 0 });
  });

  it('uses iOS cold-start fallback when native insets are zero', () => {
    const prev = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const { result } = renderHook(() => useTopSafeInset());
    expect(result.current).toBeGreaterThanOrEqual(59);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: prev });
  });

  it('prefers live safe area inset when available', () => {
    mockUseSafeAreaInsets.mockReturnValue({ top: 62, bottom: 34, left: 0, right: 0 });
    const { result } = renderHook(() => useTopSafeInset());
    expect(result.current).toBe(62);
  });
});
