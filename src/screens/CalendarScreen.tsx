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
  ScrollView,
  FlatList,
  useWindowDimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarMoodStyle, MoodEntry, MoodGrade } from '../types';
import { MoodPicker } from '../components';
import { createEntry, getAllEntries, getEntry, getSettings, upsertEntry } from '../lib/storage';
import { getMoodColor } from '../lib/constants/moods';
import { colors, spacing, borderRadius, typography } from '../theme';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Cache month matrices to avoid recomputing on every render/scroll.
const monthMatrixCache = new Map<string, (number | null)[][]>();

function buildMonthMatrix(y: number, m: number): (number | null)[][] {
  const first = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < first; i++) days.push(null);
  for (let d = 1; d <= dim; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function getMonthMatrix(y: number, m: number): (number | null)[][] {
  const key = `${y}-${m}`;
  const cached = monthMatrixCache.get(key);
  if (cached) return cached;
  const computed = buildMonthMatrix(y, m);
  monthMatrixCache.set(key, computed);
  return computed;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toISODateString(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function monthKey(y: number, m: number) {
  return `${y}-${pad2(m + 1)}`;
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export default function CalendarScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Space to keep content visually centered above the floating bottom nav.
  // FloatingTabBar is positioned at bottom: spacing[8] and has its own height.
  // iPhone 15 Pro: keep enough room so the last row of months never sits under the floating tab bar.
  const bottomOverlaySpace = insets.bottom + spacing[8] + 72;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<Record<string, MoodEntry>>({});
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [calendarMoodStyle, setCalendarMoodStyle] = useState<CalendarMoodStyle>('dot');
  const [selectedDate, setSelectedDate] = useState<string>(toISODateString(new Date()));
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editMood, setEditMood] = useState<MoodGrade | null>(null);
  const [editNote, setEditNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<{ y: number; m: number }>({
    y: new Date().getFullYear(),
    m: new Date().getMonth(),
  });

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const monthListRef = useRef<any>(null);
  const lastVisibleMonthKeyRef = useRef<string | null>(null);

  // Year grid moved to `CalendarView` for performance.

  useFocusEffect(
    useCallback(() => {
      loadEntries();
      loadSettings();
    }, [])
  );

  // If navigated from CalendarView, accept requested month/year.
  useEffect(() => {
    const y = route.params?.year;
    const m = route.params?.month;
    if (typeof y === 'number' && typeof m === 'number') {
      setCurrentDate(new Date(y, m, 1));
      setVisibleMonth({ y, m });
    }
  }, [route.params?.year, route.params?.month]);

  async function loadEntries() {
    const data = await getAllEntries();
    setEntries(data);
  }

  async function loadSettings() {
    const settings = await getSettings();
    setCalendarMoodStyle(settings.calendarMoodStyle);
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const iso = toISODateString(today);
    setSelectedDate(iso);
  };

  // (No year-mode behavior here anymore.)

  const getMoodForDate = (y: number, m: number, d: number): MoodGrade | null => {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return entries[dateStr]?.mood ?? null;
  };

  // Check if day is today
  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const renderDayCell = (opts: {
    day: number | null;
    y: number;
    m: number;
    isTodayCell: boolean;
    mood: MoodGrade | null;
    isMini?: boolean;
  }) => {
    const { day, y, m, mood, isTodayCell, isMini } = opts;
    if (!day) return <View style={[styles.dayCell, isMini && styles.dayCellMini]} />;

    const iso = `${y}-${pad2(m + 1)}-${pad2(day)}`;
    const isSelected = iso === selectedDate;

    const moodColor = mood ? getMoodColor(mood) : null;
    const isFill = calendarMoodStyle === 'fill' && moodColor;

    return (
      <View style={[styles.dayCell, isMini && styles.dayCellMini]}>
        <View
          style={[
            styles.dayContent,
            isMini && styles.dayContentMini,
            isFill && { backgroundColor: moodColor },
            isTodayCell && styles.todayCell,
            isSelected && styles.selectedCell,
          ]}
        >
          <TouchableOpacity
            style={styles.dayTapArea}
            activeOpacity={0.7}
            onPress={async () => {
              setSelectedDate(iso);
              const existing = await getEntry(iso);
              setEditMood(existing?.mood ?? null);
              setEditNote(existing?.note ?? '');
              setIsEditOpen(true);
            }}
          >
            <Text
              style={[
                styles.dayText,
                isMini && styles.dayTextMini,
                isFill && styles.dayTextOnFill,
                isTodayCell && !isFill && styles.todayText,
              ]}
            >
              {day}
            </Text>
            {!isFill && moodColor ? (
              <View style={[styles.moodDot, isMini && styles.moodDotMini, { backgroundColor: moodColor }]} />
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderWeekdayRow = (isMini: boolean) => (
    <View style={[styles.weekdayRow, isMini && styles.weekdayRowMini]}>
      {WEEKDAYS.map((d) => (
        <View key={d} style={[styles.weekdayCell, isMini && styles.weekdayCellMini]}>
          <Text style={[styles.weekdayText, isMini && styles.weekdayTextMini]}>{d[0]}</Text>
        </View>
      ))}
    </View>
  );

  const renderMonthGrid = (y: number, m: number, isMini: boolean) => {
    const weeks = getMonthMatrix(y, m);
    const today = new Date();

    return (
      <View style={[styles.calendarGrid, isMini && styles.calendarGridMini]}>
        {weeks.map((week, wIdx) => (
          <View key={`${y}-${m}-w${wIdx}`} style={styles.weekRow}>
            {week.map((d, dIdx) => {
              const mood = d ? getMoodForDate(y, m, d) : null;
              const isTodayCell =
                !!d &&
                d === today.getDate() &&
                m === today.getMonth() &&
                y === today.getFullYear();

              return (
                <View key={`${y}-${m}-w${wIdx}-d${dIdx}`} style={styles.weekCol}>
                  {renderDayCell({ day: d, y, m, isTodayCell, mood, isMini })}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const monthsForTimeline = useMemo(() => {
    // iOS-like: show a scrollable timeline of months around the anchor month.
    // Keep it bounded but large enough to feel “infinite”.
    const anchor = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    // Performance: fewer rendered months = smoother scrolling.
    // Still feels “infinite” but avoids heavy initial render.
    const rangePast = 12;
    const rangeFuture = 18;
    const months: { y: number; m: number; key: string }[] = [];
    for (let i = -rangePast; i <= rangeFuture; i++) {
      const d = addMonths(anchor, i);
      months.push({ y: d.getFullYear(), m: d.getMonth(), key: monthKey(d.getFullYear(), d.getMonth()) });
    }
    return months;
  }, [currentDate]);

  type MonthListItem =
    | { type: 'header'; key: string; y: number; m: number }
    | { type: 'month'; key: string; y: number; m: number };

  const monthListData: MonthListItem[] = useMemo(() => {
    const out: MonthListItem[] = [];
    monthsForTimeline.forEach(({ y, m, key }) => {
      out.push({ type: 'header', key: `${key}:h`, y, m });
      out.push({ type: 'month', key: `${key}:m`, y, m });
    });
    return out;
  }, [monthsForTimeline]);

  const stickyHeaderIndices = useMemo(() => {
    // Every header is at an even index (0,2,4...) since we push header+month pairs.
    return monthListData
      .map((it, idx) => (it.type === 'header' ? idx : -1))
      .filter((idx) => idx >= 0);
  }, [monthListData]);

  // Fix: deterministic month jump (prevents Jan 2026 showing Jan/Feb 2025).
  // We scroll by index instead of relying on measured layout offsets (which can drift).
  useEffect(() => {
    if (mode !== 'month') return;
    const targetKey = monthKey(currentDate.getFullYear(), currentDate.getMonth());
    const targetIndex = monthListData.findIndex(
      (it) => it.type === 'month' && it.key === `${targetKey}:m`
    );
    if (targetIndex < 0) return;

    // Align large title immediately.
    setVisibleMonth({ y: currentDate.getFullYear(), m: currentDate.getMonth() });

    const t = setTimeout(() => {
      monthListRef.current?.scrollToIndex({
        index: targetIndex,
        animated: false,
        viewOffset: 16,
      });
    }, 0);

    return () => clearTimeout(t);
  }, [mode, currentDate, monthListData]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {mode === 'month' ? (
        <>
          {/* iOS Calendar-style top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.yearBack}
              onPress={() => navigation.navigate('CalendarView', { year: visibleMonth.y })}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color={colors.system.blue} />
              <Text style={styles.yearBackText}>{visibleMonth.y}</Text>
            </TouchableOpacity>

            <View style={styles.topBarRight}>
              <TouchableOpacity style={styles.iconButton} onPress={() => Alert.alert('Search', 'Search coming next.')} activeOpacity={0.7}>
                <Ionicons name="search" size={20} color={colors.system.label} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={async () => {
                  const existing = await getEntry(selectedDate);
                  setEditMood(existing?.mood ?? null);
                  setEditNote(existing?.note ?? '');
                  setIsEditOpen(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={24} color={colors.system.label} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Settings')} activeOpacity={0.7}>
                <Ionicons name="settings-outline" size={20} color={colors.system.label} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Large month title (iOS Large Title style) */}
          <Text style={styles.largeMonthTitle}>{MONTHS[visibleMonth.m]}</Text>

          {/* Month timeline with sticky month headers (like iOS) */}
          <FlatList
            ref={monthListRef}
            data={monthListData}
            keyExtractor={(item) => item.key}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={stickyHeaderIndices}
            contentContainerStyle={styles.monthTimeline}
            onViewableItemsChanged={({ viewableItems }) => {
              const firstMonth = viewableItems.find((v) => (v.item as MonthListItem).type === 'month');
              if (firstMonth?.item && (firstMonth.item as MonthListItem).type === 'month') {
                const it = firstMonth.item as Extract<MonthListItem, { type: 'month' }>;
                const k = monthKey(it.y, it.m);
                if (lastVisibleMonthKeyRef.current !== k) {
                  lastVisibleMonthKeyRef.current = k;
                  setVisibleMonth({ y: it.y, m: it.m });
                }
              }
            }}
            viewabilityConfig={{ itemVisiblePercentThreshold: 20 }}
            removeClippedSubviews
            initialNumToRender={6}
            windowSize={7}
            maxToRenderPerBatch={6}
            updateCellsBatchingPeriod={50}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                monthListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: false,
                  viewOffset: 16,
                });
              }, 50);
            }}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return (
                  <View style={styles.stickyHeader}>
                    <Text style={styles.monthSectionTitle}>{MONTHS[item.m]} {item.y}</Text>
                  </View>
                );
              }
              // month
              return (
                <View style={styles.monthSection}>
                  <View style={styles.calendarCard}>
                    {renderWeekdayRow(false)}
                    {renderMonthGrid(item.y, item.m, false)}
                  </View>
                </View>
              );
            }}
          />

          {/* Today pill (like iOS) */}
          <TouchableOpacity style={styles.todayPill} onPress={goToToday} activeOpacity={0.8}>
            <Text style={styles.todayPillText}>Today</Text>
          </TouchableOpacity>
        </>
      ) : null}

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
                  await upsertEntry(createEntry(selectedDate, editMood, editNote));
                  await loadEntries();
                  setIsEditOpen(false);
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
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: borderRadius.md,
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
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
  monthTimeline: {
    paddingBottom: 140, // space for floating nav + Today pill
  },
  stickyHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
    backgroundColor: colors.system.background,
  },
  monthSection: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8], // more air between months (closer to iOS)
  },
  monthSectionTitle: {
    ...typography.footnote,
    color: colors.system.secondaryLabel,
    marginBottom: spacing[2],
    letterSpacing: 0.3,
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

  todayPill: {
    position: 'absolute',
    left: spacing[4],
    bottom: 92,
    backgroundColor: colors.system.secondaryBackground,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.system.separator,
  },
  todayPillText: {
    ...typography.headline,
    color: colors.system.label,
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
