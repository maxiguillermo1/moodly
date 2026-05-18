/**
 * @fileoverview Vertical list handlers: hide floating tab bar while scrolling; restore when idle.
 * @module hooks/useScrollDrivenTabBarVisibility
 */

import { useCallback } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { TIMELINE_DRAG_COMMIT_VY_PMS, scrollDragReleaseWillDecelerate } from '../utils';
import { interactionQueue } from '../system/interactionQueue';
import { useTabBarAutoHide } from '../navigation/TabBarAutoHideContext';
import { useAppTheme } from '../theme';

/**
 * FlashList / FlatList props: wire these to `onScrollBeginDrag`, `onScrollEndDrag`, etc.
 * Uses the same fling threshold as the calendar month timeline so behavior stays consistent.
 */
export function useScrollDrivenTabBarVisibility() {
  const { hideTabBar, showTabBar } = useTabBarAutoHide();
  const { a11y } = useAppTheme();

  const onScrollBeginDrag = useCallback(() => {
    if (!a11y.reduceMotion) hideTabBar();
    interactionQueue.setUserScrolling(true);
    interactionQueue.setMomentum(false);
  }, [a11y.reduceMotion, hideTabBar]);

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      interactionQueue.setUserScrolling(false);
      const vy = e.nativeEvent.velocity?.y;
      if (!scrollDragReleaseWillDecelerate(vy, TIMELINE_DRAG_COMMIT_VY_PMS)) {
        showTabBar();
      }
    },
    [showTabBar]
  );

  const onMomentumScrollBegin = useCallback(() => {
    if (!a11y.reduceMotion) hideTabBar();
    interactionQueue.setUserScrolling(true);
    interactionQueue.setMomentum(true);
  }, [a11y.reduceMotion, hideTabBar]);

  const onMomentumScrollEnd = useCallback(() => {
    interactionQueue.setMomentum(false);
    interactionQueue.setUserScrolling(false);
    showTabBar();
  }, [showTabBar]);

  return {
    hideTabBar,
    showTabBar,
    onScrollBeginDrag,
    onScrollEndDrag,
    onMomentumScrollBegin,
    onMomentumScrollEnd,
  };
}
