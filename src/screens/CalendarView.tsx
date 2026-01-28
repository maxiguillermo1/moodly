/**
 * @fileoverview CalendarView - Year grid view (separate screen for performance)
 * @module screens/CalendarView
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  InteractionManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

import { MoodEntry } from '../types';
import { MonthGrid, ScreenHeader, WeekdayRow } from '../components';
import { getAllEntries, getSettings } from '../data';
import { colors, spacing, typography } from '../theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  /**
   * Stabilize the initial year so we don't "boot" in the wrong year and then
   * flicker when params arrive late.
   */
  const initialYearRef = useRef<number>(
    typeof route.params?.year === 'number' ? route.params.year : new Date().getFullYear()
  );

  const [yearBase, setYearBase] = useState<number>(() => initialYearRef.current);
  const [entries, setEntries] = useState<Record<string, MoodEntry>>({});
  const [calendarMoodStyle, setCalendarMoodStyle] = useState<CalendarMoodStyle>('dot');

  const yearPagerRef = useRef<any>(null);
  const [pagerReady, setPagerReady] = useState(false);
  const lastRequestedYearRef = useRef<number | null>(null);

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
    const [data, settings] = await Promise.all([getAllEntries(), getSettings()]);
    // Avoid pointless rerenders when these are cache hits.
    setEntries((prev) => (prev === (data as any) ? prev : (data as any)));
    setCalendarMoodStyle((prev) => (prev === settings.calendarMoodStyle ? prev : settings.calendarMoodStyle));
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

  const renderMiniMonth = useCallback(
    (y: number, mIdx: number, cardWidth: number, marginRight: number) => (
      <TouchableOpacity
        key={`${y}-${mIdx}`}
        activeOpacity={0.7}
        style={[styles.miniMonth, { width: cardWidth, marginRight }]}
        onPress={() => navigation.navigate('CalendarScreen', { year: y, month: mIdx })}
      >
        <Text style={styles.miniMonthTitle}>{MONTHS[mIdx]}</Text>
        <WeekdayRow variant="mini" />
        <MonthGrid
          year={y}
          monthIndex0={mIdx}
          variant="mini"
          entries={entries}
          calendarMoodStyle={calendarMoodStyle}
        />
      </TouchableOpacity>
    ),
    [calendarMoodStyle, entries, navigation]
  );

  const keyExtractor = useCallback((y: number) => String(y), []);

  const onMomentumScrollEnd = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
      const newYear = years[idx] ?? yearBase;
      if (newYear !== yearBase) setYearBase(newYear);
    },
    [windowWidth, yearBase, years]
  );

  const renderYearPage = useCallback(
    ({ item: y }: { item: number }) => {
      const { colGap, cardWidth } = layout;
      return (
        <View style={yearPageStyle}>
          <View style={[styles.gridWrapper, gridWrapperPadStyle]}>
            <View style={[styles.grid, gridHorizontalPadStyle]}>
              {monthIndices.map((mIdx) => {
                const isEndOfRow = (mIdx + 1) % 3 === 0;
                return renderMiniMonth(y, mIdx, cardWidth, isEndOfRow ? 0 : colGap);
              })}
            </View>
          </View>
        </View>
      );
    },
    [gridHorizontalPadStyle, gridWrapperPadStyle, layout, monthIndices, renderMiniMonth, yearPageStyle]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={String(yearBase)} showSettings onPressSettings={openSettings} />

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
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={renderYearPage}
      />
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

