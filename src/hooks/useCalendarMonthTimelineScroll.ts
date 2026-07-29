/**
 * @fileoverview Month timeline FlashList: bounded window, scroll-end commits, layout coalescing.
 * @module hooks/useCalendarMonthTimelineScroll
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { type SharedValue } from 'react-native-reanimated';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import {
  buildMonthWindow,
  computeMonthTimelineRowHeights,
  MonthItem,
  monthKey as monthKey2,
  CALENDAR_MONTH_WINDOW_NEAR_EDGE,
  computeMonthWindowExtension,
  monthWindowOffsetsKey,
  resolveMonthTimelineSpacing,
  resolveCardCenteredTimelineScrollOffset,
  CALENDAR_MONTH_TIMELINE_LIST_CONTENT_PADDING_BOTTOM,
  TIMELINE_DRAG_COMMIT_VY_PMS,
  TIMELINE_VIEWABILITY_CONFIG,
  scrollDragReleaseWillDecelerate,
} from '../utils';
import { buildFullGridMetrics } from '../components/calendar/fullGridLayout';
import { spacing } from '../theme';
import { logger } from '../security';
import { perfProbe } from '../perf';
import { haptics } from '../system/haptics';
import { interactionQueue } from '../system/interactionQueue';

export type VisibleMonth = { y: number; m: number };

export type CalendarMonthTimelineScrollConfig = {
  currentDate: Date;
  reduceMotion: boolean;
  isFocusedRef: React.MutableRefObject<boolean>;
  deferredInteractionRef: React.MutableRefObject<{ cancel: () => void } | null>;
  initialVisibleMonth: VisibleMonth;
  windowWidth: number;
  listViewportHeight: number;
  fontScale: number;
  /** Keeps large-title collapse in sync after programmatic scroll. */
  scrollY?: SharedValue<number>;
  screen?: string;
  tabBarOnScrollBeginDrag: () => void;
  tabBarOnScrollEndDrag: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  tabBarOnMomentumScrollBegin: () => void;
  tabBarOnMomentumScrollEnd: () => void;
};

export type CalendarMonthTimelineScrollResult = {
  visibleMonth: VisibleMonth;
  monthsData: MonthItem[];
  timelineKey: string;
  initialMonthIndex: number;
  monthListRef: React.RefObject<FlashListRef<MonthItem> | null>;
  listReady: boolean;
  viewabilityConfig: { itemVisiblePercentThreshold: number };
  onViewableItemsChanged: (info: {
    viewableItems: Array<{ item: MonthItem; index: number | null }>;
  }) => void;
  onListLayout: () => void;
  onScrollBeginDrag: () => void;
  onMomentumScrollBegin: () => void;
  onScrollEndDrag: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onMomentumScrollEnd: () => void;
  AnimatedFlashList: React.ComponentType<any>;
  keyExtractor: (item: MonthItem) => string;
  fullGridMetrics: ReturnType<typeof buildFullGridMetrics>;
  monthTimelineSpacing: ReturnType<typeof resolveMonthTimelineSpacing>;
  onCalendarCardInnerLayout: (e: LayoutChangeEvent) => void;
  timelineRowHeights: number[];
  overrideItemLayout: (layout: { size?: number }, item: MonthItem, index: number) => void;
  /** Cancel pending card-width rAF (pass to snapshot load `onBlurExtra`). */
  clearLayoutCoalesce: () => void;
};

export function useCalendarMonthTimelineScroll({
  currentDate,
  reduceMotion,
  isFocusedRef,
  deferredInteractionRef,
  initialVisibleMonth,
  windowWidth,
  listViewportHeight,
  fontScale,
  scrollY,
  screen = 'CalendarScreen',
  tabBarOnScrollBeginDrag,
  tabBarOnScrollEndDrag,
  tabBarOnMomentumScrollBegin,
  tabBarOnMomentumScrollEnd,
}: CalendarMonthTimelineScrollConfig): CalendarMonthTimelineScrollResult {
  const [visibleMonth, setVisibleMonth] = useState<VisibleMonth>(initialVisibleMonth);
  const [windowOffsets, setWindowOffsets] = useState(() => ({ start: -600, end: 600 }));
  const lastWindowKeyRef = useRef(monthWindowOffsetsKey(windowOffsets));

  const [listReady, setListReady] = useState(false);
  const listReadyRef = useRef(false);
  const recenterIndexRef = useRef<number | null>(null);
  const monthListRef = useRef<FlashListRef<MonthItem>>(null);
  const lastVisibleMonthKeyRef = useRef<string | null>(null);
  const pendingMonthRef = useRef<VisibleMonth | null>(null);
  const isUserScrollingRef = useRef(false);
  const pendingWindowExtendRef = useRef<null | 'start' | 'end'>(null);
  const pendingFirstIndexRef = useRef<number | null>(null);
  const layoutCoalesceRafRef = useRef<number | null>(null);
  const pendingMeasuredInnerWRef = useRef<number | null>(null);

  const monthPad = useMemo(
    () =>
      resolveMonthTimelineSpacing({
        fontScale,
        windowWidth,
        listViewportHeight,
      }),
    [fontScale, listViewportHeight, windowWidth]
  );

  const monthsData: MonthItem[] = useMemo(() => {
    const startMs = perfProbe.enabled ? perfProbe.nowMs() : 0;
    if (perfProbe.enabled) perfProbe.setCulpritPhase(`${screen}.buildMonthWindow`);
    const data = buildMonthWindow(currentDate, windowOffsets.start, windowOffsets.end);
    if (perfProbe.enabled) {
      perfProbe.measureSince('calendar.monthWindow.build', startMs, {
        phase: 'warm',
        source: 'ui',
        months: data.length,
      });
      perfProbe.setCulpritPhase(null);
    }
    return data;
  }, [currentDate, screen, windowOffsets.end, windowOffsets.start]);

  const timelineKey = useMemo(
    () => monthKey2(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const initialMonthIndex = useMemo(() => Math.max(0, -windowOffsets.start), [windowOffsets.start]);

  useEffect(() => {
    setVisibleMonth({ y: currentDate.getFullYear(), m: currentDate.getMonth() });
  }, [currentDate]);

  const commitVisibleMonth = useCallback(
    (next: VisibleMonth, reason: 'scrollEnd' | 'programmatic') => {
      setVisibleMonth((prev) => (prev.y === next.y && prev.m === next.m ? prev : next));
      logger.perf('calendar.visibleMonth.commit', {
        phase: 'warm',
        source: 'ui',
        y: next.y,
        m: next.m,
        reason,
      });
      if (reason === 'scrollEnd' && !reduceMotion) {
        haptics.select();
      }
    },
    [reduceMotion]
  );

  const viewabilityConfig = useMemo(() => TIMELINE_VIEWABILITY_CONFIG, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: MonthItem; index: number | null }> }) => {
      const first = viewableItems.find((v) => typeof v.index === 'number' && v.index != null);
      if (!first || first.index == null) return;

      const it = first.item;
      const k = it.key;
      if (lastVisibleMonthKeyRef.current !== k) {
        lastVisibleMonthKeyRef.current = k;
        pendingMonthRef.current = { y: it.y, m: it.m };
      }

      const idx = first.index;
      pendingFirstIndexRef.current = idx;
      const len = monthsData.length;
      if (idx <= CALENDAR_MONTH_WINDOW_NEAR_EDGE) {
        pendingWindowExtendRef.current = 'start';
      } else if (idx >= len - 1 - CALENDAR_MONTH_WINDOW_NEAR_EDGE) {
        pendingWindowExtendRef.current = 'end';
      }
    },
    [monthsData.length]
  );

  const AnimatedFlashList = useMemo(() => Animated.createAnimatedComponent(FlashList) as any, []);

  const keyExtractor = useCallback((item: MonthItem) => item.key, []);

  const onListLayout = useCallback(() => {
    listReadyRef.current = true;
    setListReady(true);
  }, []);

  const clearLayoutCoalesce = useCallback(() => {
    if (layoutCoalesceRafRef.current != null) {
      cancelAnimationFrame(layoutCoalesceRafRef.current);
      layoutCoalesceRafRef.current = null;
    }
    pendingMeasuredInnerWRef.current = null;
  }, []);

  const [measuredCalendarInnerW, setMeasuredCalendarInnerW] = useState(0);
  const estimatedCalendarInnerW = useMemo(
    () => Math.max(0, windowWidth - 2 * spacing[4] - 2 * monthPad.monthCardPadding),
    [windowWidth, monthPad.monthCardPadding]
  );
  const effectiveCalendarInnerW =
    measuredCalendarInnerW > 0 ? measuredCalendarInnerW : estimatedCalendarInnerW;
  const fullGridMetrics = useMemo(
    () => buildFullGridMetrics(effectiveCalendarInnerW),
    [effectiveCalendarInnerW]
  );

  const flushPendingCalendarCardWidth = useCallback(() => {
    clearLayoutCoalesce();
    const pending = pendingMeasuredInnerWRef.current;
    if (pending == null) return;
    pendingMeasuredInnerWRef.current = null;
    setMeasuredCalendarInnerW((prev) => (Math.abs(prev - pending) > 0.5 ? pending : prev));
  }, [clearLayoutCoalesce]);

  const flushPendingMonth = useCallback(() => {
    isUserScrollingRef.current = false;
    interactionQueue.setUserScrolling(false);
    perfProbe.enabled && perfProbe.breadcrumb(`${screen}.scrollEnd`);
    flushPendingCalendarCardWidth();

    const next = pendingMonthRef.current;
    if (next && (next.y !== visibleMonth.y || next.m !== visibleMonth.m)) {
      commitVisibleMonth(next, 'scrollEnd');
    }

    const extend = pendingWindowExtendRef.current;
    const idx = pendingFirstIndexRef.current;
    pendingWindowExtendRef.current = null;
    pendingFirstIndexRef.current = null;
    if (extend && typeof idx === 'number') {
      if (perfProbe.enabled) perfProbe.setCulpritPhase(`${screen}.windowExtend`);
      deferredInteractionRef.current?.cancel();
      const task = InteractionManager.runAfterInteractions(() => {
        if (!isFocusedRef.current) return;
        const { offsets, recenterIndex, didMutate: didMutateWindow } = computeMonthWindowExtension(
          windowOffsets,
          extend,
          idx
        );
        const key2 = monthWindowOffsetsKey(offsets);
        if (didMutateWindow && key2 !== lastWindowKeyRef.current) {
          lastWindowKeyRef.current = key2;
          recenterIndexRef.current = recenterIndex;
          setWindowOffsets(offsets);
        }
        if (!didMutateWindow) {
          perfProbe.enabled && perfProbe.clearCulpritAfterFrames(1);
        }
      });
      deferredInteractionRef.current = task;
      return;
    }

    if (perfProbe.enabled) perfProbe.setCulpritPhase(null);
  }, [
    commitVisibleMonth,
    deferredInteractionRef,
    flushPendingCalendarCardWidth,
    isFocusedRef,
    screen,
    visibleMonth.m,
    visibleMonth.y,
    windowOffsets,
  ]);

  const onScrollBeginDrag = useCallback(() => {
    tabBarOnScrollBeginDrag();
    isUserScrollingRef.current = true;
    interactionQueue.setUserScrolling(true);
    interactionQueue.setMomentum(false);
    if (perfProbe.enabled) perfProbe.setCulpritPhase(`${screen}.scroll`);
    perfProbe.enabled && perfProbe.breadcrumb(`${screen}.scrollBegin`);
  }, [screen, tabBarOnScrollBeginDrag]);

  const onMomentumScrollBegin = useCallback(() => {
    tabBarOnMomentumScrollBegin();
    isUserScrollingRef.current = true;
    interactionQueue.setUserScrolling(true);
    interactionQueue.setMomentum(true);
    if (perfProbe.enabled) perfProbe.setCulpritPhase(`${screen}.scroll`);
    perfProbe.enabled && perfProbe.breadcrumb(`${screen}.scrollMomentumBegin`);
  }, [screen, tabBarOnMomentumScrollBegin]);

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const vy = e.nativeEvent.velocity?.y;
      const willDecelerate = scrollDragReleaseWillDecelerate(vy, TIMELINE_DRAG_COMMIT_VY_PMS);
      tabBarOnScrollEndDrag(e);
      if (willDecelerate) {
        // Keep layout coalescing + scroll-end commits deferred until momentum settles.
        return;
      }
      flushPendingMonth();
    },
    [flushPendingMonth, tabBarOnScrollEndDrag]
  );

  const onMomentumScrollEnd = useCallback(() => {
    tabBarOnMomentumScrollEnd();
    interactionQueue.setMomentum(false);
    flushPendingMonth();
  }, [flushPendingMonth, tabBarOnMomentumScrollEnd]);

  const onCalendarCardInnerLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const outer = e.nativeEvent.layout.width;
      if (outer <= 0) return;
      const pad = monthPad.monthCardPadding;
      const inner = Math.max(0, outer - 2 * pad);
      if (isUserScrollingRef.current) {
        pendingMeasuredInnerWRef.current = inner;
        return;
      }
      if (layoutCoalesceRafRef.current != null) return;
      layoutCoalesceRafRef.current = requestAnimationFrame(() => {
        layoutCoalesceRafRef.current = null;
        if (isUserScrollingRef.current) {
          pendingMeasuredInnerWRef.current = inner;
          return;
        }
        setMeasuredCalendarInnerW((prev) => (Math.abs(prev - inner) > 0.5 ? inner : prev));
      });
    },
    [monthPad.monthCardPadding]
  );

  const timelineRowHeights = useMemo(
    () =>
      computeMonthTimelineRowHeights({
        monthsData,
        fullGridMetrics,
        monthCardPadding: monthPad.monthCardPadding,
        monthSectionTopPad: monthPad.monthSectionTop,
        monthSectionBottomPad: monthPad.monthSectionBottom,
      }),
    [fullGridMetrics, monthPad.monthCardPadding, monthPad.monthSectionBottom, monthPad.monthSectionTop, monthsData]
  );

  const scrollToCardCenteredMonth = useCallback(
    (index: number) => {
      if (!listReadyRef.current || !isFocusedRef.current || listViewportHeight <= 0) return;
      if (index < 0 || index >= monthsData.length) return;
      const offset = resolveCardCenteredTimelineScrollOffset({
        monthsData,
        heights: timelineRowHeights,
        index,
        viewportHeight: listViewportHeight,
        contentPaddingBottom: CALENDAR_MONTH_TIMELINE_LIST_CONTENT_PADDING_BOTTOM,
        grid: fullGridMetrics,
        monthCardPadding: monthPad.monthCardPadding,
        monthSectionTopPad: monthPad.monthSectionTop,
        monthSectionBottomPad: monthPad.monthSectionBottom,
      });

      monthListRef.current?.scrollToOffset({
        offset,
        animated: false,
        skipFirstItemOffset: false,
      });
      if (scrollY) {
        scrollY.value = offset;
      }
    },
    [
      fullGridMetrics,
      isFocusedRef,
      listViewportHeight,
      monthPad.monthCardPadding,
      monthPad.monthSectionBottom,
      monthPad.monthSectionTop,
      monthsData,
      scrollY,
      timelineRowHeights,
    ]
  );

  const maybeRecenterAfterWindowChange = useCallback(() => {
    if (!listReadyRef.current || !isFocusedRef.current) return;
    const idx = recenterIndexRef.current;
    if (idx == null) return;
    recenterIndexRef.current = null;
    deferredInteractionRef.current?.cancel();
    const task = InteractionManager.runAfterInteractions(() => {
      if (!isFocusedRef.current) return;
      if (perfProbe.enabled) perfProbe.setCulpritPhase(`${screen}.recenter`);
      scrollToCardCenteredMonth(idx);
      perfProbe.enabled && perfProbe.clearCulpritAfterFrames(2);
    });
    deferredInteractionRef.current = task;
  }, [deferredInteractionRef, isFocusedRef, screen, scrollToCardCenteredMonth]);

  useEffect(() => {
    maybeRecenterAfterWindowChange();
  }, [listReady, maybeRecenterAfterWindowChange, monthsData.length]);

  const overrideItemLayout = useCallback(
    (layout: { size?: number }, _item: MonthItem, index: number) => {
      layout.size = timelineRowHeights[index] ?? 420;
    },
    [timelineRowHeights]
  );

  return {
    visibleMonth,
    monthsData,
    timelineKey,
    initialMonthIndex,
    monthListRef,
    listReady,
    viewabilityConfig,
    onViewableItemsChanged,
    onListLayout,
    onScrollBeginDrag,
    onMomentumScrollBegin,
    onScrollEndDrag,
    onMomentumScrollEnd,
    AnimatedFlashList,
    keyExtractor,
    fullGridMetrics,
    monthTimelineSpacing: monthPad,
    onCalendarCardInnerLayout,
    timelineRowHeights,
    overrideItemLayout,
    clearLayoutCoalesce,
  };
}
