/**
 * @fileoverview Ensures the floating tab bar is visible when leaving scroll-hiding screens.
 * @module hooks/useShowTabBarOnScreenBlur
 */

import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { interactionQueue } from '../system/interactionQueue';

/**
 * Call from screens that hide the tab bar while scrolling so it never stays off-screen after blur.
 */
export function useShowTabBarOnScreenBlur(showTabBar: () => void) {
  useFocusEffect(
    useCallback(() => {
      // Always restore the bar when landing on a tab (scroll-hide is per-screen).
      showTabBar();
      return () => {
        interactionQueue.reset();
        showTabBar();
      };
    }, [showTabBar])
  );
}
