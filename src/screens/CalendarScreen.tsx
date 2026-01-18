/**
 * @fileoverview Calendar screen - Monthly mood overview
 * @module screens/CalendarScreen
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Modal,
  TextInput,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CalendarMoodStyle, MoodEntry, MoodGrade } from '../types';
import { LiquidGlass, MonthGrid, MoodPicker, WeekdayRow } from '../components';
import { createEntry, getAllEntriesWithMonthIndex, getEntry, getSettings, upsertEntry } from '../lib/storage';
import { colors, spacing, borderRadius, typography, sizing } from '../theme';
import { buildMonthWindow, MonthItem, monthKey as monthKey2 } from '../lib/calendar/monthWindow';
import { throttle } from '../lib/utils/throttle';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toISODateString(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

const WINDOW_CAP = 24;
const WINDOW_EXTEND = 6;
const WINDOW_NEAR_EDGE = 2;

const ESTIMATED_MONTH_ITEM_H = 440; // conservative; FlashList uses this for virtualization

export default function CalendarScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
      ? `${anchor.getFullYear()}-${pad2(anchor.getMonth() + 1)}-01`
      : toISODateString(deviceToday);
  }

  // Space to keep content visually centered above the floating bottom nav.
  // FloatingTabBar is positioned at bottom: spacing[8] and has its own height.
  // iPhone 15 Pro: keep enough room so the last row of months never sits under the floating tab bar.
  const bottomOverlaySpace = insets.bottom + spacing[8] + 72;
  const [currentDate, setCurrentDate] = useState(() => initialAnchorDateRef.current as Date);
  const [entries, setEntries] = useState<Record<string, MoodEntry>>({});
  const [entriesByMonthKey, setEntriesByMonthKey] = useState<Record<string, Record<string, MoodEntry>>>({});
  const [calendarMoodStyle, setCalendarMoodStyle] = useState<CalendarMoodStyle>('dot');
  const [selectedDate, setSelectedDate] = useState<string>(() => initialSelectedDateRef.current as string);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editMood, setEditMood] = useState<MoodGrade | null>(null);
  const [editNote, setEditNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<{ y: number; m: number }>(() => {
    const d = initialAnchorDateRef.current as Date;
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const [listReady, setListReady] = useState(false);
  const recenterIndexRef = useRef<number | null>(null);

  const monthListRef = useRef<any>(null);
  const lastVisibleMonthKeyRef = useRef<string | null>(null);
  const pendingMonthRef = useRef<{ y: number; m: number } | null>(null);
  const isUserScrollingRef = useRef(false);

  // Bounded window around the anchor month. Constant-cost list.
  const [windowOffsets, setWindowOffsets] = useState(() => ({ start: -6, end: 10 }));
  const lastWindowKeyRef = useRef<string>(`${windowOffsets.start}:${windowOffsets.end}`);

  // Year grid moved to `CalendarView` for performance.

  useFocusEffect(
    useCallback(() => {
      loadEntries();
      loadSettings();
    }, [])
  );

  // Keep overlay month label in sync when we change the anchor (Today / params mount).
  useEffect(() => {
    setVisibleMonth({ y: currentDate.getFullYear(), m: currentDate.getMonth() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function loadEntries() {
    const { entries: data, byMonthKey } = await getAllEntriesWithMonthIndex();
    // Avoid pointless rerenders when focus fires but data is unchanged (cache hit).
    setEntries((prev) => (prev === (data as any) ? prev : (data as any)));
    setEntriesByMonthKey((prev) => (prev === (byMonthKey as any) ? prev : (byMonthKey as any)));
  }

  async function loadSettings() {
    const settings = await getSettings();
    setCalendarMoodStyle((prev) => (prev === settings.calendarMoodStyle ? prev : settings.calendarMoodStyle));
  }

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const iso = toISODateString(today);
    setSelectedDate(iso);
  };

  // (No year-mode behavior here anymore.)
  const handleHapticSelect = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const handlePressDate = useCallback(async (isoDate: string) => {
    setSelectedDate(isoDate);
    const existing = await getEntry(isoDate);
    setEditMood(existing?.mood ?? null);
    setEditNote(existing?.note ?? '');
    setIsEditOpen(true);
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
    () => buildMonthWindow(currentDate, windowOffsets.start, windowOffsets.end),
    [currentDate, windowOffsets.end, windowOffsets.start]
  );

  const timelineKey = useMemo(
    () => monthKey2(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const initialMonthIndex = useMemo(() => Math.max(0, -windowOffsets.start), [windowOffsets.start]);

  const commitVisibleMonth = useCallback(
    (next: { y: number; m: number }) => {
      setVisibleMonth(next);
      if (!reduceMotion) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    },
    [reduceMotion]
  );

  const commitVisibleMonthThrottled = useMemo(() => throttle(commitVisibleMonth, 200), [commitVisibleMonth]);

  const maybeRecenterAfterWindowChange = useCallback(() => {
    if (!listReady) return;
    const idx = recenterIndexRef.current;
    if (idx == null) return;
    recenterIndexRef.current = null;
    requestAnimationFrame(() => {
      monthListRef.current?.scrollToIndex({ index: idx, animated: false });
    });
  }, [listReady]);

  useEffect(() => {
    maybeRecenterAfterWindowChange();
  }, [maybeRecenterAfterWindowChange, monthsData.length]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: MonthItem; index: number | null }> }) => {
      const first = viewableItems.find((v) => typeof v.index === 'number' && v.index != null);
      if (!first || first.index == null) return;

      const it = first.item;
      const k = it.key;
      if (lastVisibleMonthKeyRef.current !== k) {
        lastVisibleMonthKeyRef.current = k;
        pendingMonthRef.current = { y: it.y, m: it.m };
        if (!isUserScrollingRef.current) {
          commitVisibleMonthThrottled({ y: it.y, m: it.m });
        }
      }

      // Bounded window extension near edges (rare).
      const idx = first.index;
      const len = monthsData.length;
      if (idx <= WINDOW_NEAR_EDGE) {
        const newStart = windowOffsets.start - WINDOW_EXTEND;
        let newEnd = windowOffsets.end;
        let newLen = newEnd - newStart + 1;
        if (newLen > WINDOW_CAP) newEnd -= newLen - WINDOW_CAP;
        const key2 = `${newStart}:${newEnd}`;
        if (key2 !== lastWindowKeyRef.current) {
          lastWindowKeyRef.current = key2;
          recenterIndexRef.current = idx + WINDOW_EXTEND;
          setWindowOffsets({ start: newStart, end: newEnd });
        }
      } else if (idx >= len - 1 - WINDOW_NEAR_EDGE) {
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
        }
      }
    },
    [
      commitVisibleMonthThrottled,
      monthsData.length,
      listReady,
      windowOffsets.end,
      windowOffsets.start,
    ]
  );

  const AnimatedFlashList = useMemo(
    () => Animated.createAnimatedComponent(FlashList) as any,
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* iOS Calendar-style top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.yearBack}
          onPress={() => navigation.navigate('CalendarView', { year: visibleMonth.y })}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back to year view"
        >
          <LiquidGlass
            style={StyleSheet.absoluteFill}
            radius={sizing.capsuleRadius}
            shadow={false}
          >
            {null}
          </LiquidGlass>
          <Ionicons name="chevron-back" size={20} color={colors.system.blue} />
          <Text style={styles.yearBackText}>{visibleMonth.y}</Text>
        </TouchableOpacity>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <LiquidGlass
              style={StyleSheet.absoluteFill}
              radius={sizing.capsuleRadius}
              shadow={false}
            >
              {null}
            </LiquidGlass>
            <Ionicons name="settings-outline" size={20} color={colors.system.label} />
          </TouchableOpacity>
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
      <AnimatedFlashList
        // Key remount keeps initialScrollIndex deterministic when we reset the anchor (Today).
        key={timelineKey}
        ref={monthListRef}
        data={monthsData}
        keyExtractor={(item: MonthItem) => item.key}
        estimatedItemSize={ESTIMATED_MONTH_ITEM_H}
        estimatedListSize={{ width: windowWidth, height: 800 }}
        drawDistance={800}
        onLayout={() => setListReady(true)}
        initialScrollIndex={initialMonthIndex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.monthTimeline}
        onScrollBeginDrag={() => {
          isUserScrollingRef.current = true;
        }}
        onMomentumScrollBegin={() => {
          isUserScrollingRef.current = true;
        }}
        onScrollEndDrag={() => {
          isUserScrollingRef.current = false;
          const next = pendingMonthRef.current;
          if (next && (next.y !== visibleMonth.y || next.m !== visibleMonth.m)) {
            commitVisibleMonthThrottled(next);
          }
        }}
        onMomentumScrollEnd={() => {
          isUserScrollingRef.current = false;
          const next = pendingMonthRef.current;
          if (next && (next.y !== visibleMonth.y || next.m !== visibleMonth.m)) {
            commitVisibleMonthThrottled(next);
          }
        }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        viewabilityConfig={{ itemVisiblePercentThreshold: 20 }}
        onViewableItemsChanged={onViewableItemsChanged as any}
        renderItem={({ item }: { item: MonthItem }) => {
          const monthEntries = entriesByMonthKey[item.key] ?? {};
          const selectedForThisMonth = selectedDate.startsWith(item.key) ? selectedDate : undefined;
          return (
            <View style={styles.monthSection}>
              <Text style={styles.monthSectionTitle} allowFontScaling>
                {MONTHS[item.m]} {item.y}
              </Text>
              <View style={styles.calendarCard}>
                <WeekdayRow variant="full" />
                <MonthGrid
                  year={item.y}
                  monthIndex0={item.m}
                  variant="full"
                  entries={monthEntries}
                  calendarMoodStyle={calendarMoodStyle}
                  selectedDate={selectedForThisMonth}
                  onPressDate={handlePressDate}
                  reduceMotion={reduceMotion}
                  onHapticSelect={handleHapticSelect}
                />
              </View>
            </View>
          );
        }}
      />

      {/* Quick edit modal (tap a day or +) */}
      <Modal visible={isEditOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsEditOpen(false)}>
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditOpen(false)} activeOpacity={0.7}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedDate}</Text>
            <TouchableOpacity
              onPress={async () => {
                if (!editMood) {
                  Alert.alert('Pick a mood', 'Choose a mood before saving.');
                  return;
                }
                setIsSaving(true);
                try {
                  const next = createEntry(selectedDate, editMood, editNote);
                  await upsertEntry(next);
                  // Update local state without reloading everything (keeps scroll smooth).
                  setEntries((prev) => ({ ...prev, [selectedDate]: next }));
                  setEntriesByMonthKey((prev) => {
                    const mk = selectedDate.slice(0, 7);
                    const monthMap = prev[mk] ?? {};
                    return { ...prev, [mk]: { ...monthMap, [selectedDate]: next } };
                  });
                  if (!reduceMotion) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                  }
                  setIsEditOpen(false);
                } catch (e) {
                  if (!reduceMotion) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
                  }
                  throw e;
                } finally {
                  setIsSaving(false);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalSave}>{isSaving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalSectionLabel}>Mood</Text>
            <MoodPicker selectedMood={editMood} onSelect={setEditMood} compact />

            <Text style={[styles.modalSectionLabel, { marginTop: spacing[6] }]}>Note</Text>
            <TextInput
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
  todayButtonText: {
    ...typography.subhead,
    color: colors.system.blue,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  yearBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: sizing.capsuleHeight,
    paddingHorizontal: 12,
    borderRadius: sizing.capsuleRadius,
    overflow: 'hidden',
  },
  yearBackText: {
    ...typography.subhead,
    color: colors.system.blue,
    fontWeight: '600',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconButton: {
    height: sizing.capsuleHeight,
    minWidth: sizing.capsuleHeight,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: sizing.capsuleRadius,
    overflow: 'hidden',
  },
  yearTitle: {
    ...typography.title2,
    color: colors.system.label,
    fontWeight: '700',
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
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing[3],
  },
  weekdayRowMini: {
    marginBottom: 1,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  weekdayCellMini: {
    paddingVertical: 1,
  },
  weekdayText: {
    ...typography.caption2,
    color: colors.system.secondaryLabel,
    fontWeight: '600',
  },
  weekdayTextMini: {
    fontSize: 9,
    lineHeight: 10,
  },
  calendarGrid: {
    flexDirection: 'column',
  },
  calendarGridMini: {
    marginTop: 2,
  },
  weekRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(60, 60, 67, 0.08)', // subtle iOS-like separator
  },
  weekCol: {
    flex: 1,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1,
    aspectRatio: 1,
  },
  dayCellMini: {
    padding: 0.5,
  },
  dayContent: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.system.secondaryBackground,
  },
  dayContentMini: {
    borderRadius: 6,
  },
  dayText: {
    ...typography.body,
    color: colors.system.label,
  },
  dayTextMini: {
    fontSize: 9,
    lineHeight: 11,
  },
  dayTextOnFill: {
    color: '#fff',
    fontWeight: '700',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: colors.system.blue,
  },
  selectedCell: {
    borderWidth: 2,
    borderColor: colors.system.blue,
  },
  dayTapArea: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    color: colors.system.blue,
    fontWeight: '700',
  },
  moodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  moodDotMini: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  // Year view styles moved to `CalendarView`.
  miniMonthCard: {
    // iOS year view: no cards, just months floating on the background.
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingVertical: spacing[1],
    paddingHorizontal: 0,
    borderWidth: 0,
    marginBottom: spacing[3],
  },
  miniMonthTitle: {
    ...typography.caption2,
    color: colors.system.secondaryLabel,
    fontWeight: '700',
    marginBottom: 2,
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
