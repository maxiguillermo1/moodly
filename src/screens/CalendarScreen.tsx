/**
 * @fileoverview Calendar screen - Monthly mood overview
 * @module screens/CalendarScreen
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Modal,
  TextInput,
  Alert,
  AccessibilityInfo,
  AppState,
  InteractionManager,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { CalendarMoodStyle, MoodEntry, MoodGrade } from '../types';
import { CapsuleButton, MonthGrid, MoodPicker, WeekdayRow } from '../components';
import { colors, spacing, borderRadius, typography } from '../theme';
import { createEntry, getAllEntriesWithMonthIndex, getEntry, getLastAllEntriesSource, getSettings, upsertEntry } from '../storage';
import { buildMonthWindow, MonthItem, monthKey as monthKey2, formatDateToISO, isLatestRequest, nextRequestId } from '../utils';
import { logger } from '../security';
import { PerfProfiler, usePerfScreen, perfProbe } from '../perf';
import { useTodayKey } from '../hooks/useTodayKey';
import { haptics } from '../system/haptics';
import { interactionQueue } from '../system/interactionQueue';
import { Touchable } from '../ui/Touchable';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EMPTY_MONTH_ENTRIES: Record<string, MoodEntry> = Object.freeze({});

// -----------------------------------------------------------------------------
// Hidden decisions / tuning constants (keep stable unless intentionally revisiting perf tradeoffs)
// -----------------------------------------------------------------------------
// Phase 8: eliminate periodic window-shift freezes.
// Instead of keeping a tiny bounded window that must be shifted (and recentered) every ~WINDOW_EXTEND months,
// use a large mostly-static window. This removes the "every ~7 months" hitch pattern without changing UI.
const WINDOW_CAP = 1201; // ~100 years of months (plenty for real use; still cheap as data array)
const WINDOW_EXTEND = 120; // only relevant if user scrolls to extreme ends (10y)
const WINDOW_NEAR_EDGE = 8; // threshold (items) considered "near edge" for extension (rare with large window)

export default function CalendarScreen() {
  usePerfScreen('CalendarScreen', { listIds: ['list.calendarMonthTimeline'] });

  const { width: windowWidth } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
  const [entriesByMonthKey, setEntriesByMonthKey] = useState<Record<string, Record<string, MoodEntry>>>({});
  // Performance-only revision counter to invalidate month-level caches without hashing/scanning.
  const entriesRevisionRef = useRef(0);
  const [calendarMoodStyle, setCalendarMoodStyle] = useState<CalendarMoodStyle>('dot');
  const [monthCardMatchesScreenBackground, setMonthCardMatchesScreenBackground] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => initialSelectedDateRef.current as string);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const noteInputRef = useRef<TextInput | null>(null);
  const prevEditOpenRef = useRef(false);
  const [editMood, setEditMood] = useState<MoodGrade | null>(null);
  const [editNote, setEditNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const getEntryReqIdRef = useRef(0);
  const { todayKey } = useTodayKey();
  const [visibleMonth, setVisibleMonth] = useState<{ y: number; m: number }>(() => {
    const d = initialAnchorDateRef.current as Date;
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const [listReady, setListReady] = useState(false);
  const listReadyRef = useRef(false);
  const recenterIndexRef = useRef<number | null>(null);

  const monthListRef = useRef<any>(null);
  const lastVisibleMonthKeyRef = useRef<string | null>(null);
  const pendingMonthRef = useRef<{ y: number; m: number } | null>(null);
  const isUserScrollingRef = useRef(false);
  const pendingWindowExtendRef = useRef<null | 'start' | 'end'>(null);
  const pendingFirstIndexRef = useRef<number | null>(null);

  // Phase 7 v2 prewarm is disabled; keep only the focused ref used elsewhere.
  const isFocusedRef = useRef(true);

  // Large window around the anchor month. Avoid shifting/recentering during normal scrolling.
  const [windowOffsets, setWindowOffsets] = useState(() => ({ start: -600, end: 600 }));
  const lastWindowKeyRef = useRef<string>(`${windowOffsets.start}:${windowOffsets.end}`);

  // Year grid moved to `CalendarView` for performance.

  const entriesLoadCountRef = useRef(0);
  const didFlushPerfReportRef = useRef(false);
  // Separate request ids so `loadEntries()` and `loadSettings()` do not cancel each other.
  const loadEntriesReqIdRef = useRef(0);
  const loadSettingsReqIdRef = useRef(0);

  const loadEntries = useCallback(async () => {
    if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarScreen.loadEntries');
    const reqId = (loadEntriesReqIdRef.current += 1);
    const phase = entriesLoadCountRef.current === 0 ? 'cold' : 'warm';
    entriesLoadCountRef.current += 1;
    const p: any = (globalThis as any).performance;
    const start = typeof p?.now === 'function' ? p.now() : Date.now();
    const { byMonthKey } = await getAllEntriesWithMonthIndex();
    if (!isMountedRef.current) return;
    if (!isFocusedRef.current) return;
    if (reqId !== loadEntriesReqIdRef.current) return;
    // Avoid pointless rerenders when focus fires but data is unchanged (cache hit).
    setEntriesByMonthKey((prev) => {
      if (prev === (byMonthKey as any)) return prev;
      entriesRevisionRef.current += 1;
      return byMonthKey as any;
    });
    const end = typeof p?.now === 'function' ? p.now() : Date.now();
    logger.perf('calendar.loadEntries', {
      phase,
      source: getLastAllEntriesSource(),
      monthsIndexed: Object.keys(byMonthKey as any).length,
      durationMs: Number(((end as number) - (start as number)).toFixed(1)),
    });
    if (perfProbe.enabled) perfProbe.setCulpritPhase(null);
  }, []);

  const loadSettings = useCallback(async () => {
    if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarScreen.loadSettings');
    const reqId = (loadSettingsReqIdRef.current += 1);
    const p: any = (globalThis as any).performance;
    const start = typeof p?.now === 'function' ? p.now() : Date.now();
    const settings = await getSettings();
    if (!isMountedRef.current) return;
    if (!isFocusedRef.current) return;
    if (reqId !== loadSettingsReqIdRef.current) return;
    setCalendarMoodStyle((prev) => (prev === settings.calendarMoodStyle ? prev : settings.calendarMoodStyle));
    setMonthCardMatchesScreenBackground((prev) =>
      prev === !!settings.monthCardMatchesScreenBackground ? prev : !!settings.monthCardMatchesScreenBackground
    );
    const end = typeof p?.now === 'function' ? p.now() : Date.now();
    logger.perf('calendar.loadSettings', {
      phase: 'warm',
      source: 'sessionCache',
      durationMs: Number(((end as number) - (start as number)).toFixed(1)),
    });
    if (perfProbe.enabled) perfProbe.setCulpritPhase(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarScreen.focus');
      isFocusedRef.current = true;
      perfProbe.enabled && perfProbe.screenSessionStart('CalendarScreen');
      // New "session" for perf reporting on each focus.
      didFlushPerfReportRef.current = false;
      loadEntries();
      loadSettings();
      return () => {
        // On blur: cancel any background prewarm work to avoid navigation freezes.
        isFocusedRef.current = false;
        // (Prewarm disabled.)

        // Tabs/stacks often keep screens mounted; flush on focus-exit so the report is observable.
        // Guarantee: exactly one perf.report per focus session (dev-only).
        if (perfProbe.enabled && !didFlushPerfReportRef.current) {
          didFlushPerfReportRef.current = true;
          perfProbe.flushReport('CalendarScreen.unmount');
        }
      };
    }, [loadEntries, loadSettings])
  );

  // Dev-only mount marker (helps correlate hitches with screen lifecycle).
  useEffect(() => {
    if (!perfProbe.enabled) return;
    logger.perf('calendar.screen.mount', { phase: 'warm', source: 'ui', screen: 'CalendarScreen' });
    return () => {
      logger.perf('calendar.screen.unmount', { phase: 'warm', source: 'ui', screen: 'CalendarScreen' });
      // NOTE: perf.report is flushed on focus-exit above to be reliable in tab navigation.
    };
  }, []);

  // Keep overlay month label in sync when we change the anchor (Today / params mount).
  useEffect(() => {
    setVisibleMonth({ y: currentDate.getFullYear(), m: currentDate.getMonth() });
  }, [currentDate]);

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

  // Background/resume safety: if the app backgrounds mid-save, make sure the
  // "saving" indicator remains consistent on resume. (No UX change; purely defensive.)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      if (!isMountedRef.current) return;
      if (isSavingRef.current) setIsSaving(true);
    });
    return () => sub.remove();
  }, []);

  // Sheet polish: haptic + focus after open animation commits (no layout/styling changes).
  useEffect(() => {
    const prev = prevEditOpenRef.current;
    prevEditOpenRef.current = isEditOpen;
    if (isEditOpen && !prev) {
      haptics.sheet();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          noteInputRef.current?.focus();
        });
      });
    } else if (!isEditOpen && prev) {
      haptics.sheet();
    }
  }, [isEditOpen]);

  // loadEntries/loadSettings are memoized above (useCallback) for focus effect correctness.

  // (No year-mode behavior here anymore.)
  const handleHapticSelect = useCallback(() => {
    haptics.select();
  }, []);

  const handlePressDate = useCallback(async (isoDate: string) => {
    const tapStartMs = perfProbe.enabled ? perfProbe.nowMs() : 0;
    if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarScreen.dayTap');
    // Prevent stale async reads from overwriting newer taps.
    // (Fast taps can race `getEntry` calls; only the latest tap wins.)
    const reqId = nextRequestId(getEntryReqIdRef);
    setSelectedDate(isoDate);
    try {
      const existing = await getEntry(isoDate);
      if (!isLatestRequest(getEntryReqIdRef, reqId)) return;
      setEditMood(existing?.mood ?? null);
      setEditNote(existing?.note ?? '');
    } catch {
      // Defensive: if storage read fails, still allow editing (user can re-save).
      logger.warn('calendar.getEntry.failed', { dateKey: isoDate });
      if (!isLatestRequest(getEntryReqIdRef, reqId)) return;
      setEditMood(null);
      setEditNote('');
    }
    if (!isLatestRequest(getEntryReqIdRef, reqId)) return;
    setIsEditOpen(true);
    if (perfProbe.enabled) {
      perfProbe.measureSince('calendar.dayTapToModalOpen', tapStartMs, { phase: 'warm', source: 'ui' });
      perfProbe.setCulpritPhase(null);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Large Title Collapse (Reanimated, UI-thread scroll)
  // ---------------------------------------------------------------------------
  const COLLAPSE_RANGE = 90; // px over which title collapses (iOS-like)
  const TITLE_TRANSLATE_Y = -16;
  const TITLE_SCALE_MIN = 0.82;

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const largeTitleStyle = useAnimatedStyle(() => {
    const t = Math.min(Math.max(scrollY.value / COLLAPSE_RANGE, 0), 1);
    const opacity = 1 - t;
    if (reduceMotion) return { opacity };
    return {
      opacity,
      transform: [
        { translateY: interpolate(t, [0, 1], [0, TITLE_TRANSLATE_Y], Extrapolate.CLAMP) },
        { scale: interpolate(t, [0, 1], [1, TITLE_SCALE_MIN], Extrapolate.CLAMP) },
      ],
    };
  }, [reduceMotion]);

  // ----------------------------------------------------------------------------
  // Month timeline (bounded window + FlashList)
  // ----------------------------------------------------------------------------
  const monthsData: MonthItem[] = useMemo(
    () => {
      const startMs = perfProbe.enabled ? perfProbe.nowMs() : 0;
      if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarScreen.buildMonthWindow');
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
    },
    [currentDate, windowOffsets.end, windowOffsets.start]
  );

  const timelineKey = useMemo(
    () => monthKey2(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const initialMonthIndex = useMemo(() => Math.max(0, -windowOffsets.start), [windowOffsets.start]);

  const commitVisibleMonth = useCallback(
    (next: { y: number; m: number }, reason: 'scrollEnd' | 'programmatic') => {
      setVisibleMonth((prev) => (prev.y === next.y && prev.m === next.m ? prev : next));
      logger.perf('calendar.visibleMonth.commit', {
        phase: 'warm',
        source: 'ui',
        y: next.y,
        m: next.m,
        reason,
      });
      // Phase 3: haptics only for real scroll-end commits (not programmatic jumps).
      if (reason === 'scrollEnd' && !reduceMotion) {
        haptics.select();
      }
    },
    [reduceMotion]
  );

  // Phase 3: no throttled commits. We commit at scroll end only.

  const maybeRecenterAfterWindowChange = useCallback(() => {
    if (!listReadyRef.current) return;
    const idx = recenterIndexRef.current;
    if (idx == null) return;
    recenterIndexRef.current = null;
    // Phase 6: move recenter off the critical post-gesture frames.
    // Behavior is identical (same index, same no-anim recenter). Only scheduling changes.
    const task = InteractionManager.runAfterInteractions(() => {
      if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarScreen.recenter');
      monthListRef.current?.scrollToIndex({ index: idx, animated: false });
      // Keep tag alive briefly to attribute any mount/layout bursts to recenter.
      perfProbe.enabled && perfProbe.clearCulpritAfterFrames(2);
    });
    // If the interaction queue is cancelled (rare), avoid holding onto refs.
    // (No-op otherwise; this is a perf-only best-effort.)
    // NOTE: We intentionally do not store the task; it naturally completes quickly.
    void task;
  }, []);

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

      // Phase 3: during active scroll, do NOT do any React work.
      // We only record intent to extend the window; we apply it at scroll end.
      const idx = first.index;
      pendingFirstIndexRef.current = idx;
      const len = monthsData.length;
      if (idx <= WINDOW_NEAR_EDGE) {
        pendingWindowExtendRef.current = 'start';
      } else if (idx >= len - 1 - WINDOW_NEAR_EDGE) {
        pendingWindowExtendRef.current = 'end';
      }
    },
    [
      monthsData.length,
      // NOTE: we intentionally do NOT depend on windowOffsets here (no state updates in scroll callback).
    ]
  );

  const AnimatedFlashList = useMemo(
    () => Animated.createAnimatedComponent(FlashList) as any,
    []
  );

  // Phase 5: stable month item layout estimate.
  // Perf-only hint: helps FlashList recycle/mount predictably and reduces layout churn.
  // Conservative estimate (a bit larger is safer than smaller; avoids blank risk).
  const overrideItemLayout = useCallback((layout: any) => {
    layout.size = 420;
  }, []);

  const keyExtractor = useCallback((item: MonthItem) => item.key, []);

  const onListLayout = useCallback(() => {
    listReadyRef.current = true;
    setListReady(true);
  }, []);

  const onScrollBeginDrag = useCallback(() => {
    isUserScrollingRef.current = true;
    interactionQueue.setUserScrolling(true);
    interactionQueue.setMomentum(false);
    if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarScreen.scroll');
    perfProbe.enabled && perfProbe.breadcrumb('CalendarScreen.scrollBegin');
  }, []);

  const onMomentumScrollBegin = useCallback(() => {
    isUserScrollingRef.current = true;
    interactionQueue.setUserScrolling(true);
    interactionQueue.setMomentum(true);
    if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarScreen.scroll');
    perfProbe.enabled && perfProbe.breadcrumb('CalendarScreen.scrollMomentumBegin');
  }, []);

  // (Prewarm disabled; keep refs for safe cancellation on blur/unmount.)

  // (Prewarm disabled.)

  const flushPendingMonth = useCallback(() => {
    isUserScrollingRef.current = false;
    interactionQueue.setUserScrolling(false);
    perfProbe.enabled && perfProbe.breadcrumb('CalendarScreen.scrollEnd');

    const next = pendingMonthRef.current;
    if (next && (next.y !== visibleMonth.y || next.m !== visibleMonth.m)) {
      commitVisibleMonth(next, 'scrollEnd');
    }

    // Perf-only: disable CalendarScreen prewarm. It can create stall-class hitches and scroll-end freezes.
    // Re-enable only if a future profile shows a net win.
    // prewarmAround(next ?? { y: visibleMonth.y, m: visibleMonth.m });

    // Phase 3: apply window expansion *only after scroll ends*.
    const extend = pendingWindowExtendRef.current;
    const idx = pendingFirstIndexRef.current;
    pendingWindowExtendRef.current = null;
    pendingFirstIndexRef.current = null;
    if (extend && typeof idx === 'number') {
      // Phase 6: move window extension off the critical post-gesture frames.
      // This targets "freeze-class" hitches caused by list resizing/mount/layout bursts.
      if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarScreen.windowExtend');
      InteractionManager.runAfterInteractions(() => {
        let didMutateWindow = false;
        if (extend === 'start') {
          const newStart = windowOffsets.start - WINDOW_EXTEND;
          let newEnd = windowOffsets.end;
          let newLen = newEnd - newStart + 1;
          if (newLen > WINDOW_CAP) newEnd -= newLen - WINDOW_CAP;
          const key2 = `${newStart}:${newEnd}`;
          if (key2 !== lastWindowKeyRef.current) {
            lastWindowKeyRef.current = key2;
            recenterIndexRef.current = idx + WINDOW_EXTEND;
            setWindowOffsets({ start: newStart, end: newEnd });
            didMutateWindow = true;
          }
        } else {
          let newStart = windowOffsets.start;
          const newEnd = windowOffsets.end + WINDOW_EXTEND;
          let newLen = newEnd - newStart + 1;
          let trimmed = 0;
          if (newLen > WINDOW_CAP) {
            trimmed = newLen - WINDOW_CAP;
            newStart += trimmed;
          }
          const key2 = `${newStart}:${newEnd}`;
          if (key2 !== lastWindowKeyRef.current) {
            lastWindowKeyRef.current = key2;
            recenterIndexRef.current = idx - trimmed;
            setWindowOffsets({ start: newStart, end: newEnd });
            didMutateWindow = true;
          }
        }

        if (!didMutateWindow) {
          // Nothing changed; clear phase quickly to avoid "stuck" attribution.
          perfProbe.enabled && perfProbe.clearCulpritAfterFrames(1);
        }
        // If we did mutate, keep `CalendarScreen.windowExtend` until recenter runs.
        // `maybeRecenterAfterWindowChange` is triggered by the existing effect once monthsData changes,
        // and it will switch the phase to `CalendarScreen.recenter` while it scrollToIndex's.
      });
      return;
    }

    if (perfProbe.enabled) perfProbe.setCulpritPhase(null);
  }, [
    commitVisibleMonth,
    visibleMonth.m,
    visibleMonth.y,
    windowOffsets.end,
    windowOffsets.start,
  ]);

  const onScrollEndDrag = useCallback(() => {
    // Drag ended; momentum may continue.
    isUserScrollingRef.current = false;
    interactionQueue.setUserScrolling(false);
    flushPendingMonth();
  }, [flushPendingMonth]);

  const onMomentumScrollEnd = useCallback(() => {
    interactionQueue.setMomentum(false);
    flushPendingMonth();
  }, [flushPendingMonth]);

  const renderMonthItem = useCallback(
    ({ item }: { item: MonthItem }) => {
      const monthEntries = entriesByMonthKey[item.key] ?? EMPTY_MONTH_ENTRIES;
      const selectedForThisMonth = selectedDate.startsWith(item.key) ? selectedDate : undefined;
      return (
        <View style={styles.monthSection}>
          <Text style={styles.monthSectionTitle} allowFontScaling>
            {MONTHS[item.m]} {item.y}
          </Text>
          <View
            style={[
              styles.calendarCard,
              monthCardMatchesScreenBackground ? styles.calendarCardMatchScreen : null,
            ]}
          >
            <WeekdayRow variant="full" />
            <MonthGrid
              year={item.y}
              monthIndex0={item.m}
              variant="full"
              entries={monthEntries}
              entriesRevision={entriesRevisionRef.current}
              calendarMoodStyle={calendarMoodStyle}
              todayKey={todayKey}
              selectedDate={selectedForThisMonth}
              onPressDate={handlePressDate}
              reduceMotion={reduceMotion}
              onHapticSelect={handleHapticSelect}
            />
          </View>
        </View>
      );
    },
    [
      calendarMoodStyle,
      entriesByMonthKey,
      handleHapticSelect,
      handlePressDate,
      monthCardMatchesScreenBackground,
      reduceMotion,
      selectedDate,
      todayKey,
    ]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* iOS Calendar-style top bar */}
      <View style={styles.topBar}>
        <CapsuleButton
          kind="back"
          iconName="chevron-back"
          iconColor={colors.system.blue}
          label={String(visibleMonth.y)}
          labelColor={colors.system.blue}
          onPress={() => navigation.navigate('CalendarView', { year: visibleMonth.y })}
          accessibilityLabel="Back to year view"
        />

        <View style={styles.topBarRight}>
          <CapsuleButton
            kind="icon"
            iconName="settings-outline"
            iconColor={colors.system.label}
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Settings"
          />
        </View>
      </View>

      {/* Large month title container (fixed height; prevents layout jump) */}
      <View style={styles.largeTitleContainer}>
        <Animated.View style={largeTitleStyle}>
          <Text style={styles.largeMonthTitle} allowFontScaling>
            {MONTHS[visibleMonth.m]}
          </Text>
        </Animated.View>
      </View>

      {/* Month timeline (months only; overlay header handles month label) */}
      <PerfProfiler id="list.calendarMonthTimeline">
        <AnimatedFlashList
          // Key remount keeps initialScrollIndex deterministic when we reset the anchor (Today).
          key={timelineKey}
          ref={monthListRef}
          data={monthsData}
          keyExtractor={keyExtractor}
          // FlashList v2 note: `estimatedItemSize` is deprecated/removed.
          estimatedListSize={{ width: windowWidth, height: 800 }}
          // Phase 5 perf knobs (tuning): tighten render-ahead/batching to reduce work during active scroll.
          // Rollback: restore drawDistance={800} and remove batching props if blanking occurs.
          drawDistance={500}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          updateCellsBatchingPeriod={80}
          // Phase 3: isolate scroll-path work; allow native to clip offscreen views.
          removeClippedSubviews
          overrideItemLayout={overrideItemLayout}
          onLayout={onListLayout}
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
        />
      </PerfProfiler>

      {/* Quick edit modal (tap a day or +) */}
      <Modal visible={isEditOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsEditOpen(false)}>
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <Touchable
              onPress={() => setIsEditOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
              style={(s: any) => [s?.pressed ? styles.pressedOpacity : null]}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </Touchable>
            <Text style={styles.modalTitle}>{selectedDate}</Text>
            <Touchable
              onPress={async () => {
                const saveStartMs = perfProbe.enabled ? perfProbe.nowMs() : 0;
                if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarScreen.modalSave');
                if (!editMood) {
                  Alert.alert('Pick a mood', 'Choose a mood before saving.');
                  return;
                }
                if (isSavingRef.current) return;
                isSavingRef.current = true;
                isMountedRef.current && setIsSaving(true);
                try {
                  const next = createEntry(selectedDate, editMood, editNote);
                  await upsertEntry(next);
                  // Update local state without reloading everything (keeps scroll smooth).
                  isMountedRef.current && setEntriesByMonthKey((prev) => {
                    const mk = selectedDate.slice(0, 7);
                    const monthMap = prev[mk] ?? {};
                    entriesRevisionRef.current += 1;
                    return { ...prev, [mk]: { ...monthMap, [selectedDate]: next } };
                  });
                  if (!reduceMotion) haptics.success();
                  isMountedRef.current && setIsEditOpen(false);
                  if (perfProbe.enabled) {
                    perfProbe.measureSince('calendar.modalSave.success', saveStartMs, { phase: 'warm', source: 'ui' });
                  }
                } catch {
                  if (!reduceMotion) haptics.error();
                  logger.warn('calendar.save.failed', { dateKey: selectedDate });
                  Alert.alert('Error', 'Failed to save. Please try again.');
                  if (perfProbe.enabled) {
                    perfProbe.measureSince('calendar.modalSave.failed', saveStartMs, { phase: 'warm', source: 'ui' });
                  }
                } finally {
                  isSavingRef.current = false;
                  isMountedRef.current && setIsSaving(false);
                  if (perfProbe.enabled) perfProbe.setCulpritPhase(null);
                }
              }}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Save"
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
              style={(s: any) => [s?.pressed ? styles.pressedOpacity : null]}
            >
              <Text style={styles.modalSave}>{isSaving ? 'Saving…' : 'Save'}</Text>
            </Touchable>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalSectionLabel}>Mood</Text>
            <MoodPicker selectedMood={editMood} onSelect={setEditMood} compact />

            <Text style={[styles.modalSectionLabel, { marginTop: spacing[6] }]}>Note</Text>
            <TextInput
              ref={noteInputRef}
              style={styles.modalNoteInput}
              placeholder="Add a short note…"
              placeholderTextColor={colors.system.tertiaryLabel}
              value={editNote}
              onChangeText={setEditNote}
              maxLength={200}
              multiline
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.system.background,
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
    color: colors.system.label,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  largeTitleContainer: {
    height: 56, // fixed height prevents layout jump while collapsing
    justifyContent: 'flex-end',
  },
  monthTimeline: {
    paddingBottom: 96, // space for floating nav
  },
  monthSection: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8], // more air between months (closer to iOS)
  },
  monthSectionTitle: {
    ...typography.headline,
    color: colors.system.label,
    fontWeight: '800',
    marginBottom: spacing[3],
    letterSpacing: -0.2,
  },
  calendarCard: {
    backgroundColor: colors.system.secondaryBackground,
    borderRadius: 18,
    padding: spacing[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.system.separator,
  },
  calendarCardMatchScreen: {
    backgroundColor: colors.system.background,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.system.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.system.separator,
    backgroundColor: colors.system.secondaryBackground,
  },
  pressedOpacity: { opacity: 0.7 },
  modalCancel: {
    ...typography.body,
    color: colors.system.secondaryLabel,
  },
  modalTitle: {
    ...typography.headline,
    color: colors.system.label,
  },
  modalSave: {
    ...typography.body,
    color: colors.system.blue,
    fontWeight: '600',
  },
  modalContent: {
    padding: spacing[4],
  },
  modalSectionLabel: {
    ...typography.footnote,
    color: colors.system.secondaryLabel,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  modalNoteInput: {
    ...typography.body,
    color: colors.system.label,
    backgroundColor: colors.system.secondaryBackground,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    minHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.system.separator,
    textAlignVertical: 'top',
  },
});
