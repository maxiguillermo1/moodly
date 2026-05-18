/**
 * @fileoverview CalendarView - Year grid view (separate screen for performance)
 * @module features/calendar/screens/CalendarView
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { FlatList, InteractionManager, type TextStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

import { MoodEntry } from '@/types';
import { ScreenHeader, YearOverviewPage, screenHeaderPrimaryTabPaddingX } from '@/components';
import { fetchMoodCalendarSnapshot } from '@/storage';
import { perfProbe } from '@/perf';
import { logger } from '@/security';
import { PerfProfiler, usePerfScreen } from '@/perf';
import { spacing, typography, useAppTheme, getCalendarTextLimits } from '@/theme';
import { useTodayKey } from '@/hooks/useTodayKey';
import { useCoalescedEpoch } from '@/hooks/useCoalescedEpoch';
import { didLocalTodayChangeAcrossBlur, afterNextFrame } from '@/utils';
import { interactionQueue } from '@/system/interactionQueue';
import { announceForAccessibility } from '@/system/accessibility';

type CalendarMoodStyle = 'dot' | 'fill';

// -----------------------------------------------------------------------------
// Hidden decisions / tuning constants (keep stable unless intentionally revisiting UX/perf tradeoffs)
// -----------------------------------------------------------------------------
const YEARS_AROUND_INITIAL = 100; // 100 years back + 100 years forward (+ current)
const YEARS_COUNT = YEARS_AROUND_INITIAL * 2 + 1;

// Visual tuning constants used only to compute padding/centering; does not change navigation/UI structure.
const HEADER_VISUAL_HEIGHT_ESTIMATE = 88; // iOS large-title header approx height
const MINI_GRID_HEIGHT_ESTIMATE = 520; // ~ 3×4 mini-month grid height
const GRID_SHIFT_DOWN_PX = 24; // positive moves grid down; tuned for iPhone 15 Pro

export default function CalendarView() {
  usePerfScreen('CalendarView', { listIds: ['list.calendarYearPager'] });

  const { windowWidth, windowHeight, fontScale, system: sys, moodGradeColorStyle, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mountedRef = useRef(true);
  const scrollRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (scrollRetryTimeoutRef.current) clearTimeout(scrollRetryTimeoutRef.current);
      scrollRetryTimeoutRef.current = null;
    };
  }, []);

  /**
   * Stabilize the initial year so we don't "boot" in the wrong year and then
   * flicker when params arrive late.
   */
  const initialYearRef = useRef<number>(
    typeof route.params?.year === 'number' ? route.params.year : new Date().getFullYear()
  );

  const [yearBase, setYearBase] = useState<number>(() => initialYearRef.current);
  const [entriesByMonthKey, setEntriesByMonthKey] = useState<Record<string, Record<string, MoodEntry>>>({});
  const entriesRevisionRef = useRef(0);
  const [calendarMoodStyle, setCalendarMoodStyle] = useState<CalendarMoodStyle>('dot');
  const { todayKey } = useTodayKey();
  /** Coalesced bump so FlashList refreshes recycled mini-month rows only when data/today/theme actually move. */
  const [yearListEpoch, scheduleYearRecycleBump] = useCoalescedEpoch();
  const todayKeyWhenBlurredRef = useRef<string | null>(null);
  const todayKeyRef = useRef(todayKey);
  todayKeyRef.current = todayKey;
  const prevTodayKeyForMidnightEpochRef = useRef(todayKey);

  const yearPagerRef = useRef<any>(null);
  const [pagerReady, setPagerReady] = useState(false);
  /** Last route param year we aligned the pager to (avoid re-scroll on every focus when unchanged). */
  const appliedRouteYearRef = useRef<number | undefined>(undefined);
  const momentumStartMsRef = useRef<number | null>(null);
  const didFlushPerfReportRef = useRef(false);
  const isFocusedRef = useRef(true);
  const loadReqIdRef = useRef(0);

  useEffect(() => {
    if (!perfProbe.enabled) return;
    logger.perf('calendar.yearView.mount', { phase: 'warm', source: 'ui', screen: 'CalendarView' });
    return () => {
      logger.perf('calendar.yearView.unmount', { phase: 'warm', source: 'ui', screen: 'CalendarView' });
    };
  }, []);

  const miniMonthTitleStyle = useMemo(
    () =>
      ({
        ...typography.caption2,
        color: sys.secondaryLabel,
        fontWeight: '700' as const,
        marginBottom: 2,
      }) as TextStyle,
    [sys.secondaryLabel]
  );

  const calLimits = useMemo(() => getCalendarTextLimits(fontScale, windowWidth), [fontScale, windowWidth]);

  const load = useCallback(async () => {
    if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarView.load');
    const reqId = (loadReqIdRef.current += 1);
    const p: any = (globalThis as any).performance;
    const start = typeof p?.now === 'function' ? p.now() : Date.now();
    const { byMonthKey, calendarMoodStyle: nextStyle } = await fetchMoodCalendarSnapshot();
    if (!mountedRef.current) return;
    if (!isFocusedRef.current) return;
    if (reqId !== loadReqIdRef.current) return;
    let dataMutated = false;
    setEntriesByMonthKey((prev) => {
      if (prev === (byMonthKey as any)) return prev;
      dataMutated = true;
      entriesRevisionRef.current += 1;
      return byMonthKey as any;
    });
    setCalendarMoodStyle((prev) => {
      if (prev === nextStyle) return prev;
      dataMutated = true;
      return nextStyle;
    });
    if (dataMutated) scheduleYearRecycleBump();
    const end = typeof p?.now === 'function' ? p.now() : Date.now();
    logger.perf('calendar.yearView.load', {
      phase: 'warm',
      source: 'sessionCache',
      monthsIndexed: Object.keys(byMonthKey as any).length,
      durationMs: Number(((end as number) - (start as number)).toFixed(1)),
    });
    if (perfProbe.enabled) perfProbe.setCulpritPhase(null);
  }, [scheduleYearRecycleBump]);

  // Flush perf.report on focus-exit (blur); `reason` is a stable tag for log pipelines (not literal unmount).
  useFocusEffect(
    useCallback(() => {
      if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarView.focus');
      isFocusedRef.current = true;
      perfProbe.enabled && perfProbe.screenSessionStart('CalendarView');
      didFlushPerfReportRef.current = false;
      if (didLocalTodayChangeAcrossBlur(todayKeyWhenBlurredRef.current, todayKeyRef.current)) {
        scheduleYearRecycleBump();
      }
      const task = InteractionManager.runAfterInteractions(() => {
        void load();
      });
      return () => {
        task.cancel();
        isFocusedRef.current = false;
        todayKeyWhenBlurredRef.current = todayKeyRef.current;

        if (perfProbe.enabled && !didFlushPerfReportRef.current) {
          didFlushPerfReportRef.current = true;
          queueMicrotask(() => {
            perfProbe.flushReport('CalendarView.blur');
          });
        }
      };
    }, [load, scheduleYearRecycleBump])
  );

  useEffect(() => {
    if (!isFocusedRef.current) return;
    if (prevTodayKeyForMidnightEpochRef.current === todayKey) return;
    prevTodayKeyForMidnightEpochRef.current = todayKey;
    scheduleYearRecycleBump();
  }, [todayKey, scheduleYearRecycleBump]);

  const [yearsStart, setYearsStart] = useState<number>(() => initialYearRef.current - YEARS_AROUND_INITIAL);
  const years = useMemo(
    () => Array.from({ length: YEARS_COUNT }, (_, i) => yearsStart + i),
    [yearsStart]
  );
  const initialYearIndex = useMemo(() => {
    const idx = yearBase - yearsStart;
    return Math.min(Math.max(idx, 0), YEARS_COUNT - 1);
  }, [yearBase, yearsStart]);

  const bottomOverlaySpace = insets.bottom + spacing[8] + 72;

  const openSettings = useCallback(() => {
    navigation.getParent()?.getParent()?.navigate('Settings');
  }, [navigation]);

  const yearToIndex = useCallback((y: number) => {
    const idx = y - yearsStart;
    return Math.min(Math.max(idx, 0), YEARS_COUNT - 1);
  }, [yearsStart]);

  // Jump when `route.params.year` changes, but only after layout so scrollToIndex is reliable.
  useEffect(() => {
    const y = route.params?.year;
    if (typeof y !== 'number' || !Number.isFinite(y)) return;
    if (!pagerReady) return;
    if (appliedRouteYearRef.current === y) return;
    appliedRouteYearRef.current = y;
    if (y < yearsStart || y > yearsStart + YEARS_COUNT - 1) {
      setYearsStart(y - YEARS_AROUND_INITIAL);
      setYearBase(y);
      return afterNextFrame(() => {
        if (!mountedRef.current || !isFocusedRef.current) return;
        yearPagerRef.current?.scrollToIndex({ index: YEARS_AROUND_INITIAL, animated: false });
      });
    }
    const idx = yearToIndex(y);
    setYearBase(y);
    return afterNextFrame(() => {
      if (!mountedRef.current || !isFocusedRef.current) return;
      yearPagerRef.current?.scrollToIndex({ index: idx, animated: false });
    });
  }, [pagerReady, route.params?.year, yearToIndex, yearsStart]);

  const usable = windowHeight - insets.top - HEADER_VISUAL_HEIGHT_ESTIMATE - bottomOverlaySpace;
  const gridPadBase = Math.max(0, Math.floor((usable - MINI_GRID_HEIGHT_ESTIMATE) / 2));
  const gridPadTop = gridPadBase + GRID_SHIFT_DOWN_PX;
  const gridPadBottom = Math.max(0, gridPadBase - GRID_SHIFT_DOWN_PX);

  const monthIndices = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  const layout = useMemo(() => {
    const horizontalPadding = spacing[4] * 2;
    const colGap = spacing[2];
    const available = windowWidth - horizontalPadding;
    const cardWidth = Math.floor((available - colGap * 2) / 3);
    return { horizontalPadding, colGap, cardWidth };
  }, [windowWidth]);

  const yearPageStyle = useMemo(
    () => ({ width: windowWidth, paddingBottom: bottomOverlaySpace }),
    [bottomOverlaySpace, windowWidth]
  );

  const gridWrapperPadStyle = useMemo(
    () => ({ paddingTop: gridPadTop, paddingBottom: gridPadBottom }),
    [gridPadBottom, gridPadTop]
  );

  const gridHorizontalPadStyle = useMemo(() => ({ paddingHorizontal: spacing[4] }), []);

  const openMonth = useCallback(
    (y: number, mIdx: number) => {
      if (!mountedRef.current || !isFocusedRef.current) return;
      navigation.navigate('CalendarScreen', { year: y, month: mIdx });
    },
    [navigation]
  );

  const keyExtractor = useCallback((y: number) => String(y), []);

  const onMomentumScrollEnd = useCallback(
    (e: any) => {
      interactionQueue.setMomentum(false);
      interactionQueue.setUserScrolling(false);
      if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarView.pageSettle');
      perfProbe.enabled && perfProbe.breadcrumb('CalendarView.scrollEnd');
      const startMs = momentumStartMsRef.current;
      momentumStartMsRef.current = null;
      const idx = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
      const newYear = years[idx] ?? yearBase;
      if (newYear !== yearBase) {
        setYearBase(newYear);
        announceForAccessibility(`${newYear}`);
      }
      if (perfProbe.enabled) {
        logger.perf('calendar.yearView.page', { phase: 'warm', source: 'ui', y: newYear, index: idx });
        if (typeof startMs === 'number') {
          perfProbe.measureSince('calendar.yearView.momentumEnd', startMs, { phase: 'warm', source: 'ui' });
        }
        perfProbe.clearCulpritAfterFrames(2);
      }
    },
    [windowWidth, yearBase, years]
  );

  const onMomentumScrollBegin = useCallback(() => {
    interactionQueue.setUserScrolling(true);
    interactionQueue.setMomentum(true);
    if (!perfProbe.enabled) return;
    momentumStartMsRef.current = perfProbe.nowMs();
    perfProbe.setCulpritPhase('CalendarView.scroll');
    perfProbe.breadcrumb('CalendarView.scrollBegin');
  }, []);

  const miniMonthWidthStyle = useMemo(() => ({ width: layout.cardWidth }), [layout.cardWidth]);
  const miniMonthMarginRightStyle = useMemo(() => ({ marginRight: layout.colGap }), [layout.colGap]);
  const miniMonthMarginZeroStyle = useMemo(() => ({ marginRight: 0 }), []);

  const renderYearPage = useCallback(
    ({ item: y }: { item: number }) => {
      return (
        <YearOverviewPage
          y={y}
          yearPageStyle={yearPageStyle}
          gridWrapperPadStyle={gridWrapperPadStyle}
          gridHorizontalPadStyle={gridHorizontalPadStyle}
          monthIndices={monthIndices}
          miniMonthWidthStyle={miniMonthWidthStyle}
          miniMonthMarginRightStyle={miniMonthMarginRightStyle}
          miniMonthMarginZeroStyle={miniMonthMarginZeroStyle}
          entriesByMonthKey={entriesByMonthKey}
          entriesRevision={entriesRevisionRef.current}
          yearRecycleEpoch={yearListEpoch}
          calendarMoodStyle={calendarMoodStyle}
          todayKey={todayKey}
          moodGradeColorStyle={moodGradeColorStyle}
          isDark={isDark}
          monthTitleStyle={miniMonthTitleStyle}
          miniMonthTitleMaxFontMult={calLimits.miniMonthTitle}
          onOpenMonth={openMonth}
        />
      );
    },
    [
      calendarMoodStyle,
      calLimits.miniMonthTitle,
      entriesByMonthKey,
      gridHorizontalPadStyle,
      gridWrapperPadStyle,
      isDark,
      miniMonthMarginRightStyle,
      miniMonthMarginZeroStyle,
      miniMonthTitleStyle,
      miniMonthWidthStyle,
      monthIndices,
      moodGradeColorStyle,
      openMonth,
      todayKey,
      yearListEpoch,
      yearPageStyle,
    ]
  );

  const yearPagerExtraData = useMemo(
    () => ({
      entriesByMonthKey,
      todayKey,
      calendarMoodStyle,
      yearListEpoch,
      entriesRevision: entriesRevisionRef.current,
      moodGradeColorStyle,
      isDark,
    }),
    [entriesByMonthKey, todayKey, calendarMoodStyle, yearListEpoch, moodGradeColorStyle, isDark]
  );

  const screenStyle = useMemo(() => ({ flex: 1, backgroundColor: sys.background }), [sys.background]);

  return (
    <SafeAreaView style={screenStyle} edges={['top']}>
      <ScreenHeader
        title={String(yearBase)}
        showSettings
        onPressSettings={openSettings}
        contentPaddingHorizontal={screenHeaderPrimaryTabPaddingX}
      />

      <PerfProfiler id="list.calendarYearPager">
        <FlatList
          key={String(yearsStart)}
          ref={yearPagerRef}
          style={screenStyle}
          data={years}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          accessibilityLabel="Year calendar pages"
          accessibilityHint="Swipe left or right to move between years"
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialYearIndex}
          getItemLayout={(_, index) => ({ length: windowWidth, offset: windowWidth * index, index })}
          onLayout={() => setPagerReady(true)}
          removeClippedSubviews
          initialNumToRender={1}
          windowSize={2}
          maxToRenderPerBatch={1}
          updateCellsBatchingPeriod={50}
          onScrollToIndexFailed={(info) => {
            if (scrollRetryTimeoutRef.current) clearTimeout(scrollRetryTimeoutRef.current);
            scrollRetryTimeoutRef.current = setTimeout(() => {
              scrollRetryTimeoutRef.current = null;
              if (!mountedRef.current || !isFocusedRef.current) return;
              yearPagerRef.current?.scrollToIndex({ index: info.index, animated: false });
            }, 50);
          }}
          onMomentumScrollBegin={onMomentumScrollBegin}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={renderYearPage}
          extraData={yearPagerExtraData}
        />
      </PerfProfiler>
    </SafeAreaView>
  );
}
