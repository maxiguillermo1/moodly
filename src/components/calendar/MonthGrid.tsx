/**
 * @fileoverview Month grid (shared between CalendarScreen + CalendarView)
 * Hot path: minimize allocations and rerenders for smooth scrolling.
 * @module components/calendar/MonthGrid
 *
 * Hidden decisions (intentional):
 * - Date keys are local `YYYY-MM-DD` strings (see `src/lib/utils/date.ts` and `src/data/model/entry.ts`).
 * - `monthIndex0` is 0-based (0..11) to match JS Date.
 * - `todayIso` is computed once per mount (does not update at midnight without remount) to keep the hot path cheap.
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MoodEntry, MoodGrade } from '../../types';
import { getMonthMatrix } from '../../utils';
import { getMoodColor } from '../../utils';
import { colors } from '../../theme';

export type CalendarMoodStyle = 'dot' | 'fill';

interface MonthGridProps {
  year: number;
  monthIndex0: number;
  variant: 'mini' | 'full';
  entries: Record<string, MoodEntry>; // Ideally pre-filtered to the month for perf (CalendarScreen does this)
  calendarMoodStyle: CalendarMoodStyle;
  selectedDate?: string;
  onPressDate?: (isoDate: string) => void;
  reduceMotion?: boolean;
  onHapticSelect?: () => void;
}

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function iso(year: number, monthIndex0: number, day: number) {
  // Construct a local date key without `Date` allocations (timezone-safe for our local-key semantics).
  const mm = String(monthIndex0 + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

type Sizes = {
  cellH: number;
  cellW: number;
  vMargin: number;
  dayFontSize: number;
  dayLineHeight: number;
  dotSize: number;
  dotMarginTop: number;
  textTopNudge: number;
  todayRingW: number;
};

const DayCell = React.memo(function DayCell(props: {
  dateStr: string;
  day: number;
  moodColor: string | null;
  isFill: boolean;
  isSelected: boolean;
  isToday: boolean;
  forceBold: boolean;
  sizes: Sizes;
  variant: 'mini' | 'full';
  reduceMotion: boolean;
  onPressDate?: (isoDate: string) => void;
  onHapticSelect?: () => void;
  a11yLabel: string;
}) {
  const {
    dateStr,
    day,
    moodColor,
    isFill,
    isSelected,
    isToday,
    forceBold,
    sizes,
    variant,
    reduceMotion,
    onPressDate,
    onHapticSelect,
    a11yLabel,
  } = props;
  const isBold = isFill || forceBold;

  const cellSizeStyle = useMemo(
    () => ({
      width: sizes.cellW,
      height: sizes.cellH,
      marginVertical: sizes.vMargin,
    }),
    [sizes.cellH, sizes.cellW, sizes.vMargin]
  );

  const pillBaseStyle = useMemo(
    () => ({
      width: sizes.cellW,
      height: sizes.cellH,
      borderRadius: sizes.cellH / 2,
    }),
    [sizes.cellH, sizes.cellW]
  );

  const todayRingStyle = useMemo(
    () => ({
      borderWidth: sizes.todayRingW,
      borderColor: colors.system.blue,
    }),
    [sizes.todayRingW]
  );

  const dayTextSizeStyle = useMemo(
    () => ({
      fontSize: sizes.dayFontSize,
      lineHeight: sizes.dayLineHeight,
      marginTop: sizes.textTopNudge,
    }),
    [sizes.dayFontSize, sizes.dayLineHeight, sizes.textTopNudge]
  );

  const dotBaseStyle = useMemo(
    () => ({
      width: sizes.dotSize,
      height: sizes.dotSize,
      borderRadius: sizes.dotSize / 2,
      marginTop: sizes.dotMarginTop,
    }),
    [sizes.dotMarginTop, sizes.dotSize]
  );

  const handlePress = useCallback(() => {
    onHapticSelect?.();
    onPressDate?.(dateStr);
  }, [dateStr, onHapticSelect, onPressDate]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={isSelected ? { selected: true } : undefined}
      style={({ pressed }) => [
        styles.cell,
        cellSizeStyle,
        pressed ? styles.pressedOpacity : null,
        !reduceMotion && pressed && variant === 'full' ? styles.pressedFull : null,
      ]}
    >
      <View
        style={[
          styles.pill,
          pillBaseStyle,
          isFill && moodColor ? { backgroundColor: moodColor } : null,
          isSelected ? styles.selectedRing : isToday ? todayRingStyle : null,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            dayTextSizeStyle,
            isFill ? styles.dayTextOnFill : styles.dayTextOnBg,
            isBold ? styles.dayTextBold : styles.dayTextRegular,
          ]}
          allowFontScaling={variant === 'full'}
        >
          {day}
        </Text>
        {!isFill && moodColor ? (
          <View
            style={[dotBaseStyle, { backgroundColor: moodColor }]}
          />
        ) : null}
      </View>
    </Pressable>
  );
});

export const MonthGrid = React.memo(function MonthGrid({
  year,
  monthIndex0,
  variant,
  entries,
  calendarMoodStyle,
  selectedDate,
  onPressDate,
  reduceMotion = false,
  onHapticSelect,
}: MonthGridProps) {
  const weeks = useMemo(() => getMonthMatrix(year, monthIndex0), [year, monthIndex0]);
  const todayIso = useMemo(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, []);

  // Only affects CalendarView's mini grid when "Full color days" is enabled.
  const forceBoldMiniWhenFillTheme = variant === 'mini' && calendarMoodStyle === 'fill';

  const sizes: Sizes = useMemo(() => {
    if (variant === 'mini') {
      return {
        cellH: 14,
        cellW: 14,
        vMargin: 1,
        // When theme is "fill", make numbers slightly smaller in the Year (mini) grid.
        dayFontSize: calendarMoodStyle === 'fill' ? 7 : 9,
        dayLineHeight: calendarMoodStyle === 'fill' ? 9 : 10,
        dotSize: 3,
        dotMarginTop: 1,
        textTopNudge: 0,
        todayRingW: 1, // subtle + uncluttered in mini year grid
      };
    }
    return {
      cellH: 44,
      cellW: 44, // enables a perfect circle for "today" (matches iOS feel)
      vMargin: 2,
      dayFontSize: 17,
      dayLineHeight: 22,
      dotSize: 6,
      dotMarginTop: 4,
      textTopNudge: 2,
      todayRingW: 3, // slightly stronger in full month view
    };
  }, [calendarMoodStyle, variant]);

  const monthName = MONTHS_LONG[monthIndex0] ?? '';

  const emptyCellStyle = useMemo(
    () => ({ width: sizes.cellW, height: sizes.cellH, marginVertical: sizes.vMargin }),
    [sizes.cellH, sizes.cellW, sizes.vMargin]
  );

  return (
    <View style={styles.grid}>
      {weeks.map((week, wIdx) => (
        <View key={`w-${year}-${monthIndex0}-${wIdx}`} style={styles.row}>
          {week.map((day, dIdx) => {
            if (!day) {
              return (
                <View
                  key={`e-${year}-${monthIndex0}-${wIdx}-${dIdx}`}
                  style={emptyCellStyle}
                />
              );
            }

            const dateStr = iso(year, monthIndex0, day);
            const entry = entries[dateStr];
            const mood: MoodGrade | null = entry?.mood ?? null;
            const note = entry?.note ?? '';
            const moodColor = mood ? getMoodColor(mood) : null;
            const isFill = calendarMoodStyle === 'fill' && !!moodColor;
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === todayIso;

            // iOS-like label without Date allocations:
            const a11yParts = [`${monthName} ${day}, ${year}`];
            if (mood) a11yParts.push(`Mood: ${mood}`);
            if (note.trim().length > 0) a11yParts.push('Has note');

            return (
              <DayCell
                key={`c-${year}-${monthIndex0}-${wIdx}-${dIdx}`}
                dateStr={dateStr}
                day={day}
                moodColor={moodColor}
                isFill={isFill}
                isSelected={isSelected}
                isToday={isToday}
                forceBold={forceBoldMiniWhenFillTheme}
                sizes={sizes}
                variant={variant}
                reduceMotion={reduceMotion}
                onPressDate={onPressDate}
                onHapticSelect={onHapticSelect}
                a11yLabel={a11yParts.join('. ')}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { width: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  pressedOpacity: { opacity: 0.85 },
  pressedFull: { transform: [{ scale: 0.985 }] },
  pill: { alignItems: 'center', justifyContent: 'center' },
  selectedRing: { borderWidth: 2, borderColor: colors.system.blue },
  dayText: { textAlign: 'center' },
  dayTextOnBg: { color: colors.system.label },
  dayTextOnFill: { color: '#fff' },
  dayTextBold: { fontWeight: '700' },
  dayTextRegular: { fontWeight: '400' },
});

