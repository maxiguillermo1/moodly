/**
 * @fileoverview Calendar screen - Monthly mood overview
 * @module features/calendar/screens/CalendarScreen
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AccessibilityInfo,
  Dimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useTopSafeInset } from '@/hooks/useTopSafeInset';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { MoodEntry } from '@/types';
import { CalendarTimelineMonth, CapsuleButton } from '@/components';
import { useAppTheme, getCalendarTextLimits, spacing, typography } from '@/theme';
import { getLastAllEntriesSource } from '@/storage/entries';
import {
  MONTH_NAMES_EN_LONG,
  MonthItem,
  monthKey as monthKey2,
  formatDateToISO,
  CALENDAR_MONTH_TIMELINE_HEADER_CHROME,
  CALENDAR_MONTH_TIMELINE_LIST_PULL_UP_PX,
  CALENDAR_MONTH_TIMELINE_TITLE_CARD_GAP_PX,
} from '@/utils';
import { logger } from '@/security';
import { PerfProfiler, usePerfScreen, perfProbe } from '@/perf';
import {
  useScrollDrivenTabBarVisibility,
  useShowTabBarOnScreenBlur,
  useMoodCalendarSnapshotLoad,
  useCalendarMonthTimelineScroll,
  useCalendarEntryEdit,
} from '@/hooks';
import { useCoalescedEpoch } from '@/hooks/useCoalescedEpoch';
import { useTodayKey } from '@/hooks/useTodayKey';
import { haptics } from '@/system/haptics';
import { CalendarEditModal } from '../components/CalendarEditModal';

const EMPTY_MONTH_ENTRIES: Record<string, MoodEntry> = Object.freeze({});

// -----------------------------------------------------------------------------
// Hidden decisions / tuning constants (keep stable unless intentionally revisiting perf tradeoffs)
// -----------------------------------------------------------------------------
// Phase 8: eliminate periodic window-shift freezes.
// Instead of keeping a tiny bounded window that must be shifted (and recentered) every ~WINDOW_EXTEND months,
// use a large mostly-static window. This removes the "every ~7 months" hitch pattern without changing UI.
export default function CalendarScreen() {
  usePerfScreen('CalendarScreen', { listIds: ['list.calendarMonthTimeline'] });

  const appTheme = useAppTheme();
  const topInset = useTopSafeInset();
  const sys = appTheme.system;
  const windowWidth = appTheme.windowWidth;
  const moodGradeColorStyle = appTheme.moodGradeColorStyle;
  const isDark = appTheme.isDark;

  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  /**
   * Single source of truth for initial "anchor month" (computed once per mount).
   * If params provide a valid year/month, use those. Otherwise use device today.
   */
  const initialAnchorDateRef = useRef<Date | null>(null);
  const initialAnchorKeyRef = useRef<string | null>(null);
  const initialSelectedDateRef = useRef<string | null>(null);
  if (!initialAnchorDateRef.current) {
    const y = route.params?.year;
    const m = route.params?.month;
    const hasValidParams =
      typeof y === 'number' &&
      Number.isFinite(y) &&
      typeof m === 'number' &&
      Number.isFinite(m) &&
      m >= 0 &&
      m <= 11;

    const deviceToday = new Date(); // iOS device time (local timezone)
    const anchor = hasValidParams ? new Date(y, m, 1) : new Date(deviceToday.getFullYear(), deviceToday.getMonth(), 1);

    initialAnchorDateRef.current = anchor;
    initialAnchorKeyRef.current = monthKey2(anchor.getFullYear(), anchor.getMonth());
    // If we anchored from params, default selection to the first day of that month.
    initialSelectedDateRef.current = hasValidParams
      ? formatDateToISO(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
      : formatDateToISO(deviceToday);
  }

  const [currentDate] = useState(() => initialAnchorDateRef.current as Date);
  const [reduceMotion, setReduceMotion] = useState(false);
  const rm = reduceMotion || appTheme.a11y.reduceMotion;
  const {
    showTabBar,
    onScrollBeginDrag: tabBarOnScrollBeginDrag,
    onScrollEndDrag: tabBarOnScrollEndDrag,
    onMomentumScrollBegin: tabBarOnMomentumScrollBegin,
    onMomentumScrollEnd: tabBarOnMomentumScrollEnd,
  } = useScrollDrivenTabBarVisibility();
  useShowTabBarOnScreenBlur(showTabBar);
  const { todayKey } = useTodayKey();
  const [calendarListEpoch, setCalendarListEpoch] = useState(0);
  const [entriesListEpoch, scheduleEntriesListEpoch] = useCoalescedEpoch();
  const isFocusedRef = useRef(true);
  const deferredInteractionRef = useRef<{ cancel: () => void } | null>(null);

  const estimatedListViewportHeight = useMemo(() => {
    const windowH =
      appTheme.windowHeight > 0 ? appTheme.windowHeight : Dimensions.get('window').height;
    return Math.max(0, windowH - topInset - CALENDAR_MONTH_TIMELINE_HEADER_CHROME);
  }, [appTheme.windowHeight, topInset]);
  const [measuredListViewportHeight, setMeasuredListViewportHeight] = useState(0);
  const listViewportHeight =
    measuredListViewportHeight > 0 ? measuredListViewportHeight : estimatedListViewportHeight;

  const scrollY = useSharedValue(0);

  const {
    visibleMonth,
    monthsData,
    timelineKey,
    initialMonthIndex,
    monthListRef,
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
    overrideItemLayout,
    clearLayoutCoalesce,
  } = useCalendarMonthTimelineScroll({
    currentDate,
    reduceMotion: rm,
    isFocusedRef,
    deferredInteractionRef,
    initialVisibleMonth: {
      y: (initialAnchorDateRef.current as Date).getFullYear(),
      m: (initialAnchorDateRef.current as Date).getMonth(),
    },
    windowWidth: appTheme.windowWidth,
    listViewportHeight,
    fontScale: appTheme.fontScale,
    scrollY,
    tabBarOnScrollBeginDrag,
    tabBarOnScrollEndDrag,
    tabBarOnMomentumScrollBegin,
    tabBarOnMomentumScrollEnd,
  });

  const onTimelineListLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = Math.round(e.nativeEvent.layout.height);
      if (h > 0) {
        setMeasuredListViewportHeight((prev) => (prev !== h ? h : prev));
      }
      onListLayout();
    },
    [onListLayout]
  );

  const {
    entriesByMonthKey,
    setEntriesByMonthKey,
    calendarMoodStyle,
    entriesRevisionRef,
    mountedRef: isMountedRef,
  } = useMoodCalendarSnapshotLoad({
    screen: 'CalendarScreen',
    loadPerfEvent: 'calendar.loadData',
    loadPerfSource: getLastAllEntriesSource,
    todayKey,
    focusRefs: { isFocusedRef, deferredInteractionRef },
    onTodayKeyChangeWhileFocused: () => setCalendarListEpoch((x) => x + 1),
    onSnapshotMutated: scheduleEntriesListEpoch,
    perfFlushReportTag: 'CalendarScreen.unmount',
    onBlurExtra: clearLayoutCoalesce,
  });

  const {
    selectedDate,
    selectedDateRef,
    isEditOpen,
    editMood,
    editNote,
    isSaving,
    setEditMood,
    setEditNote,
    closeEdit,
    handlePressDate,
    handleSave,
  } = useCalendarEntryEdit({
    initialSelectedDate: initialSelectedDateRef.current as string,
    mountedRef: isMountedRef,
    entriesRevisionRef,
    setEntriesByMonthKey,
    reduceMotion: rm,
    onEntriesMutated: scheduleEntriesListEpoch,
  });

  // Year grid moved to `CalendarView` for performance.

  // Dev-only mount marker (helps correlate hitches with screen lifecycle).
  useEffect(() => {
    if (!perfProbe.enabled) return;
    logger.perf('calendar.screen.mount', { phase: 'warm', source: 'ui', screen: 'CalendarScreen' });
    return () => {
      logger.perf('calendar.screen.unmount', { phase: 'warm', source: 'ui', screen: 'CalendarScreen' });
      // NOTE: perf.report is flushed on focus-exit above to be reliable in tab navigation.
    };
  }, []);

  // Reduce Motion support (updates rarely; safe in React state).
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduceMotion(!!v));
    // RN event typing varies; handle both patterns.
    const sub: any = (AccessibilityInfo as any).addEventListener?.(
      'reduceMotionChanged',
      (v: boolean) => setReduceMotion(!!v)
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  // (No year-mode behavior here anymore.)
  const handleHapticSelect = useCallback(() => {
    haptics.select();
  }, []);

  // ---------------------------------------------------------------------------
  // Large Title Collapse (Reanimated, UI-thread scroll)
  // ---------------------------------------------------------------------------
  const COLLAPSE_RANGE = 90; // px over which title collapses (iOS-like)
  const TITLE_TRANSLATE_Y = -16;
  const TITLE_SCALE_MIN = 0.82;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const largeTitleStyle = useAnimatedStyle(() => {
    const t = Math.min(Math.max(scrollY.value / COLLAPSE_RANGE, 0), 1);
    const opacity = 1 - t;
    if (rm) return { opacity };
    return {
      opacity,
      transform: [
        { translateY: interpolate(t, [0, 1], [0, TITLE_TRANSLATE_Y], Extrapolate.CLAMP) },
        { scale: interpolate(t, [0, 1], [1, TITLE_SCALE_MIN], Extrapolate.CLAMP) },
      ],
    };
  }, [rm]);

  const calLimits = useMemo(
    () => getCalendarTextLimits(appTheme.fontScale, appTheme.windowWidth),
    [appTheme.fontScale, appTheme.windowWidth]
  );

  const monthListSurfaceStyle = useMemo(
    () => ({ flex: 1 as const, backgroundColor: sys.secondaryBackground }),
    [sys.secondaryBackground]
  );

  /** Lifts the whole timeline (title + card); see CALENDAR_MONTH_TIMELINE_LIST_PULL_UP_PX. */
  const monthTimelineLiftStyle = useMemo(
    () => ({
      flex: 1 as const,
      transform: [{ translateY: CALENDAR_MONTH_TIMELINE_LIST_PULL_UP_PX }],
    }),
    []
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: sys.secondaryBackground,
        },
        topBar: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing[4],
          paddingTop: spacing[2],
        },
        topBarRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
        },
        largeMonthTitle: {
          ...typography.largeTitle,
          color: sys.label,
          paddingHorizontal: spacing[4],
          paddingTop: spacing[1],
          paddingBottom: spacing[1],
        },
        largeTitleContainer: {
          height: 42,
          justifyContent: 'flex-end',
        },
        monthTimeline: {
          paddingBottom: 96,
        },
        monthSection: {
          paddingHorizontal: spacing[4],
        },
        monthSectionTitle: {
          ...typography.title1,
          color: sys.label,
          marginBottom: CALENDAR_MONTH_TIMELINE_TITLE_CARD_GAP_PX,
        },
        calendarCard: {
          backgroundColor: sys.secondaryBackground,
          borderRadius: 18,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: sys.separator,
        },
      }),
    [sys]
  );

  const timelineMonthStyles = useMemo(
    () => ({
      monthSection: styles.monthSection,
      monthSectionTitle: styles.monthSectionTitle,
      calendarCard: styles.calendarCard,
    }),
    [styles.monthSection, styles.monthSectionTitle, styles.calendarCard]
  );

  const renderMonthItem = useCallback(
    ({ item }: { item: MonthItem }) => {
      const monthEntries = entriesByMonthKey[item.key] ?? EMPTY_MONTH_ENTRIES;
      const sel = selectedDateRef.current;
      const selectedForThisMonth = sel.startsWith(item.key) ? sel : undefined;
      return (
        <CalendarTimelineMonth
          item={item}
          monthEntries={monthEntries}
          entriesRevision={entriesListEpoch}
          selectedForThisMonth={selectedForThisMonth}
          monthSectionTopPad={monthPad.monthSectionTop}
          monthSectionBottomPad={monthPad.monthSectionBottom}
          monthCardPadding={monthPad.monthCardPadding}
          fullGridMetrics={fullGridMetrics}
          calendarMoodStyle={calendarMoodStyle}
          todayKey={todayKey}
          onPressDate={handlePressDate}
          reduceMotion={rm}
          onHapticSelect={handleHapticSelect}
          moodGradeColorStyle={moodGradeColorStyle}
          isDark={isDark}
          onCalendarCardInnerLayout={onCalendarCardInnerLayout}
          monthSectionTitleMaxFontMult={calLimits.monthSectionTitle}
          calendarListEpoch={calendarListEpoch}
          styles={timelineMonthStyles}
        />
      );
    },
    [
      calendarListEpoch,
      calendarMoodStyle,
      calLimits.monthSectionTitle,
      entriesByMonthKey,
      fullGridMetrics,
      entriesListEpoch,
      handleHapticSelect,
      handlePressDate,
      isDark,
      monthPad.monthCardPadding,
      monthPad.monthSectionBottom,
      monthPad.monthSectionTop,
      moodGradeColorStyle,
      onCalendarCardInnerLayout,
      rm,
      timelineMonthStyles,
      todayKey,
    ]
  );

  /**
   * FlashList/virtualized lists do not automatically rerender cells when only external state
   * (selection, today, entries) changes — recycled rows can show stale rings. extraData forces updates.
   */
  const monthListExtraData = useMemo(
    () => ({
      selectedDate,
      todayKey,
      calendarMoodStyle,
      fullGridLayout: fullGridMetrics,
      entriesRevision: entriesListEpoch,
      calendarListEpoch,
      moodGradeColorStyle,
      isDark,
      monthTimelineSpacing: monthPad,
    }),
    [
      selectedDate,
      todayKey,
      calendarMoodStyle,
      fullGridMetrics,
      entriesListEpoch,
      calendarListEpoch,
      moodGradeColorStyle,
      isDark,
      monthPad,
    ]
  );

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* iOS Calendar-style top bar */}
      <View style={styles.topBar}>
        <CapsuleButton
          kind="back"
          iconName="chevron-back"
          iconColor={sys.blue}
          label={String(visibleMonth.y)}
          labelColor={sys.blue}
          onPress={() => navigation.navigate('CalendarView', { year: visibleMonth.y })}
          accessibilityLabel="Back to year view"
        />

        <View style={styles.topBarRight}>
          <CapsuleButton
            kind="icon"
            iconName="settings-outline"
            iconColor={sys.label}
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Settings"
          />
        </View>
      </View>

      {/* Large month title container (fixed height; prevents layout jump) */}
      <View style={styles.largeTitleContainer}>
        <Animated.View style={largeTitleStyle}>
          <Text
            style={styles.largeMonthTitle}
            allowFontScaling
            maxFontSizeMultiplier={calLimits.monthSectionTitle}
          >
            {MONTH_NAMES_EN_LONG[visibleMonth.m]}
          </Text>
        </Animated.View>
      </View>

      {/* Month timeline (months only; overlay header handles month label) */}
      <PerfProfiler id="list.calendarMonthTimeline">
        <View style={monthTimelineLiftStyle}>
          <AnimatedFlashList
          // Key remount keeps initialScrollIndex deterministic when we reset the anchor (Today).
          key={timelineKey}
          ref={monthListRef}
          style={monthListSurfaceStyle}
          data={monthsData}
          keyExtractor={keyExtractor}
          // FlashList v2 note: `estimatedItemSize` is deprecated/removed.
          estimatedListSize={{
            width: windowWidth,
            height: Math.max(320, listViewportHeight),
          }}
          // Phase 5 perf knobs (tuning): tighten render-ahead/batching to reduce work during active scroll.
          // Rollback: restore drawDistance={800} and remove batching props if blanking occurs.
          drawDistance={500}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          updateCellsBatchingPeriod={80}
          // Phase 3: isolate scroll-path work; allow native to clip offscreen views.
          removeClippedSubviews
          overrideItemLayout={overrideItemLayout}
          onLayout={onTimelineListLayout}
          initialScrollIndex={initialMonthIndex}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.monthTimeline}
          onScrollBeginDrag={onScrollBeginDrag}
          onMomentumScrollBegin={onMomentumScrollBegin}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged as any}
          renderItem={renderMonthItem as any}
          extraData={monthListExtraData}
        />
        </View>
      </PerfProfiler>

      <CalendarEditModal
        visible={isEditOpen}
        selectedDate={selectedDate}
        editMood={editMood}
        editNote={editNote}
        isSaving={isSaving}
        setEditMood={setEditMood}
        setEditNote={setEditNote}
        onCancel={closeEdit}
        onSave={() => {
          void handleSave();
        }}
      />
    </View>
  );
}
