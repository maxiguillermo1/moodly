/**
 * @fileoverview Stable top safe inset for primary tab screens.
 * @module hooks/useTopSafeInset
 *
 * Uses native safe-area metrics from react-native-safe-area-context.
 * Falls back to initialWindowMetrics, then Constants.statusBarHeight.
 * iOS cold-start fallback (59pt) only when all native sources report 0.
 */

import { useMemo } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

/** Used only when native insets are genuinely unavailable on frame 1 (Dynamic Island class). */
const IOS_COLD_START_TOP_FALLBACK = 59;

export function useTopSafeInset(): number {
  const { top } = useSafeAreaInsets();

  return useMemo(() => {
    const nativeFallback = initialWindowMetrics?.insets.top ?? 0;
    const statusBarFallback = Constants.statusBarHeight ?? 0;
    const needsIosColdFallback =
      Platform.OS === 'ios' && top <= 0 && nativeFallback <= 0 && statusBarFallback <= 0;
    const iosColdStart = needsIosColdFallback ? IOS_COLD_START_TOP_FALLBACK : 0;
    return Math.max(top, nativeFallback, statusBarFallback, iosColdStart);
  }, [top]);
}
