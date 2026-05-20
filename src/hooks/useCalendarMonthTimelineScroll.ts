/**
 * @fileoverview Month timeline FlashList: bounded window, scroll-end commits, layout coalescing.
 * @module hooks/useCalendarMonthTimelineScroll
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import {
  buildMonthWindow,
  computeMonthTimelineRowHeights,
  MonthItem,
  monthKey as monthKey2,
  CALENDAR_MONTH_WINDOW_NEAR_EDGE,
  computeMonthWindowExtension,
  monthWindowOffsetsKey,
} from '../utils';
import { buildFullGridMetrics } from '../components/calendar/fullGridLayout';
import { getMonthTimelineSpacing, spacing } from '../theme';
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
  fontScale: number;
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
  monthListRef: React.MutableRefObject<any>;
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
  fontScale,
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
  const monthListRef = useRef<any>(null);
  const lastVisibleMonthKeyRef = useRef<string | null>(null);
  const pendingMonthRef = useRef<VisibleMonth | null>(null);
  const isUserScrollingRef = useRef(false);
  const pendingWindowExtendRef = useRef<null | 'start' | 'end'>(null);
  const pendingFirstIndexRef = useRef<number | null>(null);
  const layoutCoalesceRafRef = useRef<number | null>(null);
  const pendingMeasuredInnerWRef = useRef<number | null>(null);

  const monthPad = useMemo(() => getMonthTimelineSpacing(fontScale, windowWidth), [fontScale, windowWidth]);

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

  const maybeRecenterAfterWindowChange = useCallback(() => {
    if (!listReadyRef.current || !isFocusedRef.current) return;
    const idx = recenterIndexRef.current;
    if (idx == null) return;
    recenterIndexRef.current = null;
    deferredInteractionRef.current?.cancel();
    const task = InteractionManager.runAfterInteractions(() => {
      if (!isFocusedRef.current) return;
      if (perfProbe.enabled) perfProbe.setCulpritPhase(`${screen}.recenter`);
      monthListRef.current?.scrollToIndex({ index: idx, animated: false });
      perfProbe.enabled && perfProbe.clearCulpritAfterFrames(2);
    });
    deferredInteractionRef.current = task;
  }, [deferredInteractionRef, isFocusedRef, screen]);

  useEffect(() => {
    maybeRecenterAfterWindowChange();
  }, [listReady, maybeRecenterAfterWindowChange, monthsData.length]);

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 20 }), []);

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
      isUserScrollingRef.current = false;
      interactionQueue.setUserScrolling(false);
      flushPendingMonth();
      tabBarOnScrollEndDrag(e);
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
    onCalendarCardInnerLayout,
    timelineRowHeights,
    overrideItemLayout,
    clearLayoutCoalesce,
  };
}
