/**
 * @fileoverview CalendarView - Year grid view (separate screen for performance)
 * @module screens/CalendarView
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, useWindowDimensions, InteractionManager } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

import { MoodEntry } from '../types';
import { MonthGrid, ScreenHeader, WeekdayRow } from '../components';
import { getAllEntriesWithMonthIndex, getSettings } from '../storage';
import { perfProbe } from '../perf';
import { logger } from '../security';
import { PerfProfiler, usePerfScreen } from '../perf';
import { colors, spacing, typography } from '../theme';
import { useTodayKey } from '../hooks/useTodayKey';
import { createFrameCoalescer, type FrameCoalescer } from '../utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_2 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const;

type CalendarMoodStyle = 'dot' | 'fill';

const EMPTY_MONTH_ENTRIES: Record<string, MoodEntry> = Object.freeze({});

// -----------------------------------------------------------------------------
// Hidden decisions / tuning constants (keep stable unless intentionally revisiting UX/perf tradeoffs)
// -----------------------------------------------------------------------------
const YEARS_AROUND_INITIAL = 100; // 100 years back + 100 years forward (+ current)
const YEARS_COUNT = YEARS_AROUND_INITIAL * 2 + 1;

// Visual tuning constants used only to compute padding/centering; does not change navigation/UI structure.
const HEADER_VISUAL_HEIGHT_ESTIMATE = 88; // iOS large-title header approx height
const MINI_GRID_HEIGHT_ESTIMATE = 520; // ~ 3×4 mini-month grid height
const GRID_SHIFT_DOWN_PX = 24; // positive moves grid down; tuned for iPhone 15 Pro

type MiniMonthCardProps = {
  y: number;
  mIdx: number;
  monthEntries: Record<string, MoodEntry>;
  entriesRevision: number;
  calendarMoodStyle: CalendarMoodStyle;
  todayKey: string;
  cardWidthStyle: { width: number };
  marginStyle: { marginRight: number };
  onOpenMonth: (y: number, mIdx: number) => void;
};

const MiniMonthCard = React.memo(function MiniMonthCard({
  y,
  mIdx,
  monthEntries,
  entriesRevision,
  calendarMoodStyle,
  todayKey,
  cardWidthStyle,
  marginStyle,
  onOpenMonth,
}: MiniMonthCardProps) {
  return (
    <TouchableOpacity
      key={`${y}-${mIdx}`}
      activeOpacity={0.7}
      style={[styles.miniMonth, cardWidthStyle, marginStyle]}
      onPress={() => onOpenMonth(y, mIdx)}
    >
      <Text style={styles.miniMonthTitle}>{MONTHS[mIdx]}</Text>
      <WeekdayRow variant="mini" />
      <MonthGrid
        year={y}
        monthIndex0={mIdx}
        variant="mini"
        entries={monthEntries}
        entriesRevision={entriesRevision}
        calendarMoodStyle={calendarMoodStyle}
        todayKey={todayKey}
      />
    </TouchableOpacity>
  );
});

type YearPageProps = {
  y: number;
  yearPageStyle: { width: number; paddingBottom: number };
  gridWrapperPadStyle: { paddingTop: number; paddingBottom: number };
  gridHorizontalPadStyle: { paddingHorizontal: number };
  monthIndices: number[];
  miniMonthWidthStyle: { width: number };
  miniMonthMarginRightStyle: { marginRight: number };
  miniMonthMarginZeroStyle: { marginRight: number };
  entriesByMonthKey: Record<string, Record<string, MoodEntry>>;
  entriesRevision: number;
  calendarMoodStyle: CalendarMoodStyle;
  todayKey: string;
  onOpenMonth: (y: number, mIdx: number) => void;
};

const YearPage = React.memo(function YearPage({
  y,
  yearPageStyle,
  gridWrapperPadStyle,
  gridHorizontalPadStyle,
  monthIndices,
  miniMonthWidthStyle,
  miniMonthMarginRightStyle,
  miniMonthMarginZeroStyle,
  entriesByMonthKey,
  entriesRevision,
  calendarMoodStyle,
  todayKey,
  onOpenMonth,
}: YearPageProps) {
  return (
    <View style={yearPageStyle}>
      <View style={[styles.gridWrapper, gridWrapperPadStyle]}>
        <View style={[styles.grid, gridHorizontalPadStyle]}>
          {monthIndices.map((mIdx) => {
            const mk = `${y}-${MONTH_2[mIdx]}`;
            const monthEntries = entriesByMonthKey[mk] ?? EMPTY_MONTH_ENTRIES;
            const isEndOfRow = (mIdx + 1) % 3 === 0;
            return (
              <MiniMonthCard
                key={`${y}-${mIdx}`}
                y={y}
                mIdx={mIdx}
                monthEntries={monthEntries}
                entriesRevision={entriesRevision}
                calendarMoodStyle={calendarMoodStyle}
                todayKey={todayKey}
                cardWidthStyle={miniMonthWidthStyle}
                marginStyle={isEndOfRow ? miniMonthMarginZeroStyle : miniMonthMarginRightStyle}
                onOpenMonth={onOpenMonth}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
});

export default function CalendarView() {
  usePerfScreen('CalendarView', { listIds: ['list.calendarYearPager'] });

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
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
  // Performance-only revision counter to invalidate month-level caches without hashing/scanning.
  const entriesRevisionRef = useRef(0);
  const [calendarMoodStyle, setCalendarMoodStyle] = useState<CalendarMoodStyle>('dot');
  const { todayKey } = useTodayKey();

  const yearPagerRef = useRef<any>(null);
  const [pagerReady, setPagerReady] = useState(false);
  const lastRequestedYearRef = useRef<number | null>(null);
  const momentumStartMsRef = useRef<number | null>(null);
  const didFlushPerfReportRef = useRef(false);
  const isFocusedRef = useRef(true);
  const loadReqIdRef = useRef(0);
  const openMonthCoalescerRef = useRef<FrameCoalescer<{ y: number; mIdx: number }> | null>(null);
  if (!openMonthCoalescerRef.current) {
    openMonthCoalescerRef.current = createFrameCoalescer(({ y, mIdx }) => {
      if (!mountedRef.current || !isFocusedRef.current) return;
      navigation.navigate('CalendarScreen', { year: y, month: mIdx });
    });
  }

  useEffect(() => {
    if (!perfProbe.enabled) return;
    logger.perf('calendar.yearView.mount', { phase: 'warm', source: 'ui', screen: 'CalendarView' });
    return () => {
      logger.perf('calendar.yearView.unmount', { phase: 'warm', source: 'ui', screen: 'CalendarView' });
      // NOTE: perf.report is flushed on focus-exit below to be reliable in tab navigation.
    };
  }, []);

  // Flush perf.report on focus-exit (blur) so it's reliably observable (tabs often keep screens mounted).
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      perfProbe.enabled && perfProbe.screenSessionStart('CalendarView');
      didFlushPerfReportRef.current = false;
      return () => {
        // On blur: mark unfocused to avoid any background work leaks.
        isFocusedRef.current = false;

        if (perfProbe.enabled && !didFlushPerfReportRef.current) {
          didFlushPerfReportRef.current = true;
          perfProbe.flushReport('CalendarView.unmount');
        }
      };
    }, [])
  );

  /**
   * Performance + UX:
   * The previous implementation "recentering" the year pager caused data to change,
   * which can flash white and feel janky.
   *
   * Instead, use a stable year list (virtualized by FlatList) and only update the
   * header value based on scroll position.
   */
  const yearsStartRef = useRef<number>(initialYearRef.current - YEARS_AROUND_INITIAL);
  // NOTE: `yearsStartRef` uses a fixed offset so paging remains stable across renders.
  // This is intentionally coarse and should remain stable to avoid scrollToIndex weirdness.
  // Keep the "100 years around" decision encoded as a constant above.
  const years = useMemo(
    () => Array.from({ length: YEARS_COUNT }, (_, i) => yearsStartRef.current + i),
    []
  );
  const initialYearIndex = useMemo(() => {
    const idx = initialYearRef.current - yearsStartRef.current;
    return Math.min(Math.max(idx, 0), YEARS_COUNT - 1);
  }, []);

  // Bottom space so the grid never sits under the floating tab bar.
  const bottomOverlaySpace = insets.bottom + spacing[8] + 72;

  const load = useCallback(async () => {
    if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarView.load');
    const reqId = (loadReqIdRef.current += 1);
    const p: any = (globalThis as any).performance;
    const start = typeof p?.now === 'function' ? p.now() : Date.now();
    const [{ byMonthKey }, settings] = await Promise.all([getAllEntriesWithMonthIndex(), getSettings()]);
    if (!mountedRef.current) return;
    if (!isFocusedRef.current) return;
    if (reqId !== loadReqIdRef.current) return;
    // Avoid pointless rerenders when these are cache hits.
    setEntriesByMonthKey((prev) => {
      if (prev === (byMonthKey as any)) return prev;
      entriesRevisionRef.current += 1;
      return byMonthKey as any;
    });
    setCalendarMoodStyle((prev) => (prev === settings.calendarMoodStyle ? prev : settings.calendarMoodStyle));
    const end = typeof p?.now === 'function' ? p.now() : Date.now();
    logger.perf('calendar.yearView.load', {
      phase: 'warm',
      source: 'sessionCache',
      monthsIndexed: Object.keys(byMonthKey as any).length,
      durationMs: Number(((end as number) - (start as number)).toFixed(1)),
    });
    if (perfProbe.enabled) perfProbe.setCulpritPhase(null);
  }, []);

  useEffect(() => {
    // Defer any heavier async work until after the navigation transition completes.
    // This keeps the "Year" button + floating tab bar feeling native (no hitch).
    const task = InteractionManager.runAfterInteractions(() => {
      load();
    });
    return () => task.cancel();
  }, [load]);

  const openSettings = useCallback(() => {
    navigation.getParent()?.getParent()?.navigate('Settings');
  }, [navigation]);

  const yearToIndex = useCallback((y: number) => {
    const idx = y - yearsStartRef.current;
    return Math.min(Math.max(idx, 0), YEARS_COUNT - 1);
  }, []);

  // If we navigate here with a specific year, jump there on focus (no flicker).
  useFocusEffect(
    useCallback(() => {
      const y = route.params?.year;
      if (typeof y !== 'number' || !Number.isFinite(y)) return;
      if (lastRequestedYearRef.current === y) return;
      lastRequestedYearRef.current = y;

      const idx = yearToIndex(y);
      setYearBase(y);
      if (!pagerReady) return;
      yearPagerRef.current?.scrollToIndex({ index: idx, animated: false });
    }, [pagerReady, route.params?.year, yearToIndex])
  );

  // Pixel-perfect centering: compute usable height and center the grid.
  // Header height is stable (one line). We use a tuned constant for iPhone 15 Pro.
  const usable = windowHeight - insets.top - HEADER_VISUAL_HEIGHT_ESTIMATE - bottomOverlaySpace;
  const gridPadBase = Math.max(0, Math.floor((usable - MINI_GRID_HEIGHT_ESTIMATE) / 2));
  /**
   * IMPORTANT:
   * If we add the same paddingTop and paddingBottom, the grid stays centered.
   * To *move* the grid down, we need asymmetric padding (more top, less bottom).
   */
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
      // Navigation gate: coalesce rapid taps while the year pager is settling.
      // Last tap wins; at most one navigate() is committed per frame.
      openMonthCoalescerRef.current?.enqueue({ y, mIdx });
    },
    []
  );

  useEffect(() => {
    return () => {
      openMonthCoalescerRef.current?.cancel();
      openMonthCoalescerRef.current = null;
    };
  }, []);

  const keyExtractor = useCallback((y: number) => String(y), []);

  // (Prewarm disabled; keep refs for safe cancellation on blur/unmount.)

  const onMomentumScrollEnd = useCallback(
    (e: any) => {
      if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarView.pageSettle');
      perfProbe.enabled && perfProbe.breadcrumb('CalendarView.scrollEnd');
      const startMs = momentumStartMsRef.current;
      momentumStartMsRef.current = null;
      const idx = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
      const newYear = years[idx] ?? yearBase;
      if (newYear !== yearBase) setYearBase(newYear);
      // Perf-only: disable CalendarView prewarm. In practice it competes with paging and can cause
      // stall-class hitches. Re-enable only if a future profile shows a net win.
      // prewarmYear(newYear);
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
    if (!perfProbe.enabled) return;
    momentumStartMsRef.current = perfProbe.nowMs();
    perfProbe.setCulpritPhase('CalendarView.scroll');
    perfProbe.breadcrumb('CalendarView.scrollBegin');
  }, []);

  // Keep these tiny objects stable to avoid re-render churn in each mini month.
  const miniMonthWidthStyle = useMemo(() => ({ width: layout.cardWidth }), [layout.cardWidth]);
  const miniMonthMarginRightStyle = useMemo(() => ({ marginRight: layout.colGap }), [layout.colGap]);
  const miniMonthMarginZeroStyle = useMemo(() => ({ marginRight: 0 }), []);

  const renderYearPage = useCallback(
    ({ item: y }: { item: number }) => {
      return (
        <YearPage
          y={y}
          yearPageStyle={yearPageStyle as any}
          gridWrapperPadStyle={gridWrapperPadStyle as any}
          gridHorizontalPadStyle={gridHorizontalPadStyle as any}
          monthIndices={monthIndices}
          miniMonthWidthStyle={miniMonthWidthStyle as any}
          miniMonthMarginRightStyle={miniMonthMarginRightStyle as any}
          miniMonthMarginZeroStyle={miniMonthMarginZeroStyle as any}
          entriesByMonthKey={entriesByMonthKey}
          entriesRevision={entriesRevisionRef.current}
          calendarMoodStyle={calendarMoodStyle}
          todayKey={todayKey}
          onOpenMonth={openMonth}
        />
      );
    },
    [
      calendarMoodStyle,
      entriesByMonthKey,
      gridHorizontalPadStyle,
      gridWrapperPadStyle,
      monthIndices,
      openMonth,
      todayKey,
      yearPageStyle,
      miniMonthMarginRightStyle,
      miniMonthMarginZeroStyle,
      miniMonthWidthStyle,
    ]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={String(yearBase)} showSettings onPressSettings={openSettings} />

      <PerfProfiler id="list.calendarYearPager">
        <FlatList
          ref={yearPagerRef}
          data={years}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
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
            setTimeout(() => {
              yearPagerRef.current?.scrollToIndex({ index: info.index, animated: false });
            }, 50);
          }}
          onMomentumScrollBegin={onMomentumScrollBegin}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={renderYearPage}
        />
      </PerfProfiler>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.system.background,
  },
  gridWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  miniMonth: {
    backgroundColor: 'transparent',
    marginBottom: spacing[3],
  },
  miniMonthTitle: {
    ...typography.caption2,
    color: colors.system.secondaryLabel,
    fontWeight: '700',
    marginBottom: 2,
  },
});

