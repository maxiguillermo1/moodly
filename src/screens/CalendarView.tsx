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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { MoodEntry, MoodGrade } from '../types';
import { ScreenHeader } from '../components';
import { getAllEntries, getSettings } from '../lib/storage';
import { getMoodColor } from '../lib/constants/moods';
import { colors, spacing, borderRadius, typography } from '../theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Cache month matrices (year view creates many mini-months).
const monthMatrixCache = new Map<string, (number | null)[][]>();

function buildMonthMatrix(y: number, m: number): (number | null)[][] {
  const first = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < first; i++) days.push(null);
  for (let d = 1; d <= dim; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  while (days.length < 42) days.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function getMonthMatrix(y: number, m: number) {
  const key = `${y}-${m}`;
  const cached = monthMatrixCache.get(key);
  if (cached) return cached;
  const computed = buildMonthMatrix(y, m);
  monthMatrixCache.set(key, computed);
  return computed;
}

type CalendarMoodStyle = 'dot' | 'fill';

export default function CalendarView() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const initialYear = typeof route.params?.year === 'number' ? route.params.year : new Date().getFullYear();

  const [yearBase, setYearBase] = useState<number>(initialYear);
  const [entries, setEntries] = useState<Record<string, MoodEntry>>({});
  const [calendarMoodStyle, setCalendarMoodStyle] = useState<CalendarMoodStyle>('dot');

  const yearPagerRef = useRef<any>(null);

  /**
   * Performance + UX:
   * The previous implementation "recentering" the year pager caused data to change,
   * which can flash white and feel janky.
   *
   * Instead, use a stable year list (virtualized by FlatList) and only update the
   * header value based on scroll position.
   */
  const yearsStartRef = useRef<number>(initialYear - 100);
  const YEARS_COUNT = 201; // 100 years back + current + 100 years forward
  const years = useMemo(
    () => Array.from({ length: YEARS_COUNT }, (_, i) => yearsStartRef.current + i),
    []
  );
  const initialYearIndex = useMemo(() => {
    const idx = initialYear - yearsStartRef.current;
    return Math.min(Math.max(idx, 0), YEARS_COUNT - 1);
  }, [initialYear]);

  // Bottom space so the grid never sits under the floating tab bar.
  const bottomOverlaySpace = insets.bottom + spacing[8] + 72;

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    const data = await getAllEntries();
    setEntries(data);
    const settings = await getSettings();
    setCalendarMoodStyle(settings.calendarMoodStyle);
  }, []);

  const openSettings = () => navigation.getParent()?.getParent()?.navigate('Settings');

  // Pixel-perfect centering: compute usable height and center the grid.
  // Header height is stable (one line). We use a tuned constant for iPhone 15 Pro.
  const headerHeight = 88; // large title header visual height (approx on iOS)
  const usable = windowHeight - insets.top - headerHeight - bottomOverlaySpace;
  const gridPadBase = Math.max(0, Math.floor((usable - 520) / 2)); // 520 ~ 3×4 mini-month grid height
  /**
   * IMPORTANT:
   * If we add the same paddingTop and paddingBottom, the grid stays centered.
   * To *move* the grid down, we need asymmetric padding (more top, less bottom).
   */
  const GRID_SHIFT_DOWN = 24; // +down, -up (tune on iPhone 15 Pro)
  const gridPadTop = gridPadBase + GRID_SHIFT_DOWN;
  const gridPadBottom = Math.max(0, gridPadBase - GRID_SHIFT_DOWN);

  const getMoodForDate = (y: number, m: number, d: number): MoodGrade | null => {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return entries[dateStr]?.mood ?? null;
  };

  const renderMiniMonth = useCallback((y: number, mIdx: number, cardWidth: number, marginRight: number) => {
    const weeks = getMonthMatrix(y, mIdx);
    return (
      <TouchableOpacity
        key={`${y}-${mIdx}`}
        activeOpacity={0.7}
        style={[styles.miniMonth, { width: cardWidth, marginRight }]}
        onPress={() => {
          navigation.navigate('CalendarScreen', { year: y, month: mIdx });
        }}
      >
        <Text style={styles.miniMonthTitle}>{MONTHS[mIdx]}</Text>
        <View style={styles.miniWeekdays}>
          {WEEKDAYS.map((d, idx) => (
            // Keys must be unique; weekday letters repeat (S/T), so include index.
            <Text key={`${y}-${mIdx}-wd${idx}`} style={styles.miniWeekdayText}>
              {d}
            </Text>
          ))}
        </View>
        {weeks.map((week, wIdx) => (
          <View key={`${y}-${mIdx}-w${wIdx}`} style={styles.miniWeekRow}>
            {week.map((day, dIdx) => {
              const mood = day ? getMoodForDate(y, mIdx, day) : null;
              const moodColor = mood ? getMoodColor(mood) : null;
              const isFill = calendarMoodStyle === 'fill' && moodColor;
              return (
                <View key={`${y}-${mIdx}-${wIdx}-${dIdx}`} style={styles.miniDayCell}>
                  {day ? (
                    <View style={[styles.miniDayPill, isFill && { backgroundColor: moodColor }]}>
                      <Text style={[styles.miniDayText, isFill && styles.miniDayTextOnFill]}>
                        {day}
                      </Text>
                      {!isFill && moodColor ? <View style={[styles.miniDot, { backgroundColor: moodColor }]} /> : null}
                    </View>
                  ) : (
                    <View style={styles.miniDayPill} />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </TouchableOpacity>
    );
  }, [calendarMoodStyle, navigation, entries]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={String(yearBase)} showSettings onPressSettings={openSettings} />

      <FlatList
        ref={yearPagerRef}
        data={years}
        keyExtractor={(y) => String(y)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialYearIndex}
        getItemLayout={(_, index) => ({ length: windowWidth, offset: windowWidth * index, index })}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            yearPagerRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 50);
        }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
          const newYear = years[idx] ?? yearBase;
          if (newYear !== yearBase) setYearBase(newYear);
        }}
        renderItem={({ item: y }) => {
          const horizontalPadding = spacing[4] * 2;
          const colGap = spacing[2];
          const available = windowWidth - horizontalPadding;
          const cardWidth = Math.floor((available - colGap * 2) / 3);
          return (
            <View style={{ width: windowWidth, paddingBottom: bottomOverlaySpace }}>
              <View style={[styles.gridWrapper, { paddingTop: gridPadTop, paddingBottom: gridPadBottom }]}>
                <View style={[styles.grid, { paddingHorizontal: spacing[4] }]}>
                  {Array.from({ length: 12 }, (_, mIdx) => {
                    const isEndOfRow = (mIdx + 1) % 3 === 0;
                    return renderMiniMonth(y, mIdx, cardWidth, isEndOfRow ? 0 : colGap);
                  })}
                </View>
              </View>
            </View>
          );
        }}
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
  miniWeekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  miniWeekdayText: {
    fontSize: 9,
    lineHeight: 10,
    color: colors.system.tertiaryLabel,
    width: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  miniWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniDayCell: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  miniDayPill: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  miniDayText: {
    fontSize: 9,
    lineHeight: 10,
    color: colors.system.label,
  },
  miniDayTextOnFill: {
    color: '#fff',
    fontWeight: '700',
  },
  miniDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginTop: 1,
  },
});

