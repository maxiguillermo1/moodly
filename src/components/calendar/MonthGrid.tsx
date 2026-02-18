/**
 * @fileoverview Month grid (shared between CalendarScreen + CalendarView)
 * Hot path: minimize allocations and rerenders for smooth scrolling.
 * @module components/calendar/MonthGrid
 *
 * Hidden decisions (intentional):
 * - Date keys are local `YYYY-MM-DD` strings (see `src/lib/utils/date.ts` and `src/data/model/entry.ts`).
 * - `monthIndex0` is 0-based (0..11) to match JS Date.
 * - `todayKey` is supplied by screens (updates across midnight via a single day-boundary timer).
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MoodEntry } from '../../types';
import { getMonthMatrix } from '../../utils';
import { colors } from '../../theme';
import { getMonthRenderModel } from './monthModel';
import type { CalendarMoodStyle as CalendarMoodStyle2 } from './monthModel';
import { perfProbe } from '../../perf';
import { Touchable } from '../../ui/Touchable';
import { formatDayCellA11yLabel } from '../../system/accessibility';

export type CalendarMoodStyle = CalendarMoodStyle2;

interface MonthGridProps {
  year: number;
  monthIndex0: number;
  variant: 'mini' | 'full';
  entries: Record<string, MoodEntry>; // Ideally pre-filtered to the month for perf (CalendarScreen does this)
  calendarMoodStyle: CalendarMoodStyle;
  /**
   * Performance-only: bump this number whenever the backing entries for this month change.
   * This allows MonthModel caches to invalidate without hashing or scanning.
   */
  entriesRevision?: number;
  /**
   * Optional: supply today's key once per screen mount to avoid per-MonthGrid Date work.
   * Must be local-day `YYYY-MM-DD` key.
   */
  todayKey?: string;
  selectedDate?: string;
  onPressDate?: (isoDate: string) => void;
  reduceMotion?: boolean;
  onHapticSelect?: () => void;
}

type SizeKey = 'full' | 'mini-dot' | 'mini-fill';

type SharedCellStyles = {
  cellSizeStyle: { width: number; height: number; marginVertical: number };
  pillBaseStyle: { width: number; height: number; borderRadius: number };
  todayRingStyle: { borderWidth: number; borderColor: string };
  dayTextSizeStyle: { fontSize: number; lineHeight: number; marginTop: number };
  dotBaseStyle: { width: number; height: number; borderRadius: number; marginTop: number };
};

const sharedStylesCache = new Map<SizeKey, SharedCellStyles>();
function getSharedStyles(sizeKey: SizeKey): SharedCellStyles {
  const cached = sharedStylesCache.get(sizeKey);
  if (cached) return cached;

  // These numbers match the previous Phase 1 implementation exactly.
  const sizes =
    sizeKey === 'full'
      ? {
          cellH: 44,
          cellW: 44,
          vMargin: 2,
          dayFontSize: 17,
          dayLineHeight: 22,
          dotSize: 6,
          dotMarginTop: 4,
          textTopNudge: 2,
          todayRingW: 3,
        }
      : sizeKey === 'mini-fill'
        ? {
            cellH: 14,
            cellW: 14,
            vMargin: 1,
            dayFontSize: 7,
            dayLineHeight: 9,
            dotSize: 3,
            dotMarginTop: 1,
            textTopNudge: 0,
            todayRingW: 1,
          }
        : {
            cellH: 14,
            cellW: 14,
            vMargin: 1,
            dayFontSize: 9,
            dayLineHeight: 10,
            dotSize: 3,
            dotMarginTop: 1,
            textTopNudge: 0,
            todayRingW: 1,
          };

  const next: SharedCellStyles = Object.freeze({
    cellSizeStyle: Object.freeze({
      width: sizes.cellW,
      height: sizes.cellH,
      marginVertical: sizes.vMargin,
    }),
    pillBaseStyle: Object.freeze({
      width: sizes.cellW,
      height: sizes.cellH,
      borderRadius: sizes.cellH / 2,
    }),
    todayRingStyle: Object.freeze({
      borderWidth: sizes.todayRingW,
      borderColor: colors.system.blue,
    }),
    dayTextSizeStyle: Object.freeze({
      fontSize: sizes.dayFontSize,
      lineHeight: sizes.dayLineHeight,
      marginTop: sizes.textTopNudge,
    }),
    dotBaseStyle: Object.freeze({
      width: sizes.dotSize,
      height: sizes.dotSize,
      borderRadius: sizes.dotSize / 2,
      marginTop: sizes.dotMarginTop,
    }),
  });
  sharedStylesCache.set(sizeKey, next);
  return next;
}

// Cache background color styles so DayCell never allocates `{ backgroundColor }` objects.
const bgColorStyleCache = new Map<string, { backgroundColor: string }>();
function bgStyle(color: string): { backgroundColor: string } {
  const cached = bgColorStyleCache.get(color);
  if (cached) return cached;
  const next = Object.freeze({ backgroundColor: color });
  bgColorStyleCache.set(color, next);
  return next;
}

const DayCell = React.memo(
  function DayCell(props: {
    day: number;
    moodColor: string | null;
    isFill: boolean;
    isSelected: boolean;
    isToday: boolean;
    forceBold: boolean;
    sizeKey: SizeKey;
    variant: 'mini' | 'full';
    reduceMotion: boolean;
    onPress?: () => void;
    a11yLabel: string;
  }) {
    const {
      day,
      moodColor,
      isFill,
      isSelected,
      isToday,
      forceBold,
      sizeKey,
      variant,
      reduceMotion,
      onPress,
      a11yLabel,
    } =
      props;
    const isBold = isFill || forceBold;
    const shared = getSharedStyles(sizeKey);

    if (perfProbe.enabled) {
      // Sampled breadcrumb (avoid per-cell spam): 1st day gives one signal per month.
      if (day === 1) perfProbe.breadcrumb(variant === 'mini' ? 'DayCell.render.mini' : 'DayCell.render.full');
    }

    const content = (
      <View
        style={[
          styles.pill,
          shared.pillBaseStyle,
          isFill && moodColor ? bgStyle(moodColor) : null,
          isSelected ? styles.selectedRing : isToday ? shared.todayRingStyle : null,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            shared.dayTextSizeStyle,
            isFill ? styles.dayTextOnFill : styles.dayTextOnBg,
            isBold ? styles.dayTextBold : styles.dayTextRegular,
          ]}
          allowFontScaling={variant === 'full'}
        >
          {day}
        </Text>
        {!isFill && moodColor ? <View style={[shared.dotBaseStyle, bgStyle(moodColor)]} /> : null}
      </View>
    );

    // Perf: if there's no handler, avoid mounting a Pressable (especially in CalendarView mini grids).
    if (!onPress) {
      return <View style={[styles.cell, shared.cellSizeStyle]}>{content}</View>;
    }

    return (
      <Touchable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={isSelected ? { selected: true } : undefined}
        scaleTo={reduceMotion ? 1 : 0.99}
        style={({ pressed }) => [
          styles.cell,
          shared.cellSizeStyle,
          pressed ? styles.pressedOpacity : null,
        ]}
      >
        {content}
      </Touchable>
    );
  },
  (prev, next) => {
    // Custom comparator: DayCell rerenders only when something it *renders* changes.
    return (
      prev.day === next.day &&
      prev.moodColor === next.moodColor &&
      prev.isFill === next.isFill &&
      prev.isSelected === next.isSelected &&
      prev.isToday === next.isToday &&
      prev.forceBold === next.forceBold &&
      prev.sizeKey === next.sizeKey &&
      prev.variant === next.variant &&
      prev.reduceMotion === next.reduceMotion &&
      prev.onPress === next.onPress &&
      prev.a11yLabel === next.a11yLabel
    );
  }
);

export const MonthGrid = React.memo(function MonthGrid({
  year,
  monthIndex0,
  variant,
  entries,
  calendarMoodStyle,
  entriesRevision = 0,
  todayKey,
  selectedDate,
  onPressDate,
  reduceMotion = false,
  onHapticSelect,
}: MonthGridProps) {
  if (perfProbe.enabled) {
    perfProbe.breadcrumb(variant === 'mini' ? 'MonthGrid.render.mini' : 'MonthGrid.render.full');
  }
  const weeks = useMemo(() => getMonthMatrix(year, monthIndex0), [year, monthIndex0]);
  const todayIso = useMemo(() => {
    if (typeof todayKey === 'string' && todayKey.length === 10) return todayKey;
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, [todayKey]);

  useEffect(() => {
    if (!perfProbe.enabled) return;
    // Keep breadcrumbs useful: mini grids mount 12× per year page; sample to avoid drowning the ring buffer.
    if (variant === 'mini' && monthIndex0 !== 0) return;
    perfProbe.breadcrumb(variant === 'mini' ? 'MonthGrid.commit.mini' : 'MonthGrid.commit.full');
  }, [monthIndex0, variant]);

  const model = useMemo(() => {
    return getMonthRenderModel({
      year,
      monthIndex0,
      variant,
      calendarMoodStyle,
      monthEntries: entries,
      entriesRevision,
      selectedDate,
      todayIso,
      onPressDate,
      onHapticSelect,
    });
  }, [
    year,
    monthIndex0,
    variant,
    calendarMoodStyle,
    entries,
    entriesRevision,
    selectedDate,
    todayIso,
    onPressDate,
    onHapticSelect,
  ]);

  // Only affects CalendarView's mini grid when "Full color days" is enabled.
  const forceBoldMiniWhenFillTheme = variant === 'mini' && calendarMoodStyle === 'fill';

  const shared = getSharedStyles(model.sizeKey);
  const emptyCellStyle = shared.cellSizeStyle;

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

            const dateStr = model.isoByDay[day]!;
            const entry = entries[dateStr];
            const moodColor = model.moodColorByDay[day] ?? null;
            const isFill = model.isFillTheme && !!moodColor;
            const isSelected = model.selectedDay === day;
            const isToday = model.todayDay === day;

            // Only compute VoiceOver labels when the day is actually pressable.
            // Mini grids do not mount Pressables, so this avoids wasted work during year paging.
            const a11yLabel = model.pressByDay
              ? formatDayCellA11yLabel({
                  weekdayIndex0: model.weekdayByDay[day] ?? 0,
                  monthName: model.monthName,
                  day,
                  year,
                  mood: entry?.mood ?? null,
                  hasNote: model.hasNoteByDay[day],
                })
              : '';

            return (
              <DayCell
                key={`c-${year}-${monthIndex0}-${wIdx}-${dIdx}`}
                day={day}
                moodColor={moodColor}
                isFill={isFill}
                isSelected={isSelected}
                isToday={isToday}
                forceBold={forceBoldMiniWhenFillTheme}
                sizeKey={model.sizeKey}
                variant={variant}
                reduceMotion={reduceMotion}
                onPress={model.pressByDay ? model.pressByDay[day] : undefined}
                a11yLabel={a11yLabel}
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
  pill: { alignItems: 'center', justifyContent: 'center' },
  selectedRing: { borderWidth: 2, borderColor: colors.system.blue },
  dayText: { textAlign: 'center' },
  dayTextOnBg: { color: colors.system.label },
  dayTextOnFill: { color: '#fff' },
  dayTextBold: { fontWeight: '700' },
  dayTextRegular: { fontWeight: '400' },
});

