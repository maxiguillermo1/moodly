/**
 * @fileoverview Month grid (shared between CalendarScreen + CalendarView)
 * Hot path: minimize allocations and rerenders for smooth scrolling.
 * @module components/calendar/MonthGrid
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { getMonthMatrix } from '../../lib/calendar/monthMatrix';
import { MoodEntry, MoodGrade } from '../../types';
import { getMoodColor } from '../../lib/constants/moods';
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
  mood: MoodGrade | null;
  note: string;
  moodColor: string | null;
  isFill: boolean;
  isSelected: boolean;
  isToday: boolean;
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
    sizes,
    variant,
    reduceMotion,
    onPressDate,
    onHapticSelect,
    a11yLabel,
  } = props;

  const handlePress = useCallback(() => {
    onHapticSelect?.();
    onPressDate?.(dateStr);
  }, [dateStr, onHapticSelect, onPressDate]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={isSelected ? { selected: true } : {}}
      style={({ pressed }) => [
        styles.cell,
        {
          width: sizes.cellW,
          height: sizes.cellH,
          marginVertical: sizes.vMargin,
          opacity: pressed ? 0.85 : 1,
        },
        !reduceMotion && pressed && variant === 'full' ? styles.pressedFull : null,
      ]}
    >
      <View
        style={[
          styles.pill,
          {
            width: sizes.cellW,
            height: sizes.cellH,
            borderRadius: sizes.cellH / 2,
            backgroundColor: isFill && moodColor ? moodColor : 'transparent',
          },
          isSelected ? styles.selectedRing : isToday ? { borderWidth: sizes.todayRingW, borderColor: colors.system.blue } : null,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            {
              fontSize: sizes.dayFontSize,
              lineHeight: sizes.dayLineHeight,
              color: isFill ? '#fff' : colors.system.label,
              fontWeight: isFill ? '700' : '400',
              marginTop: sizes.textTopNudge,
            },
          ]}
          allowFontScaling={variant === 'full'}
        >
          {day}
        </Text>
        {!isFill && moodColor ? (
          <View
            style={{
              width: sizes.dotSize,
              height: sizes.dotSize,
              borderRadius: sizes.dotSize / 2,
              backgroundColor: moodColor,
              marginTop: sizes.dotMarginTop,
            }}
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

  const sizes: Sizes = useMemo(() => {
    if (variant === 'mini') {
      return {
        cellH: 14,
        cellW: 14,
        vMargin: 1,
        dayFontSize: 9,
        dayLineHeight: 10,
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
  }, [variant]);

  const monthName = MONTHS_LONG[monthIndex0] ?? '';

  return (
    <View style={styles.grid}>
      {weeks.map((week, wIdx) => (
        <View key={`w-${year}-${monthIndex0}-${wIdx}`} style={styles.row}>
          {week.map((day, dIdx) => {
            if (!day) {
              return (
                <View
                  key={`e-${year}-${monthIndex0}-${wIdx}-${dIdx}`}
                  style={{ width: sizes.cellW, height: sizes.cellH, marginVertical: sizes.vMargin }}
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
                mood={mood}
                note={note}
                moodColor={moodColor}
                isFill={isFill}
                isSelected={isSelected}
                isToday={isToday}
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
  pressedFull: { transform: [{ scale: 0.985 }] },
  pill: { alignItems: 'center', justifyContent: 'center' },
  selectedRing: { borderWidth: 2, borderColor: colors.system.blue },
  dayText: { textAlign: 'center' },
});

