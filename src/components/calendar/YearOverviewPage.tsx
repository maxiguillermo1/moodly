/**
 * @fileoverview Year overview grid: 12 mini months per page (CalendarView).
 * Render-isolated so horizontal paging does not force redundant work across years.
 * @module components/calendar/YearOverviewPage
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, type TextStyle } from 'react-native';

import type { MoodEntry } from '../../types';
import type { MoodGradeColorStyle } from '../../types/settings.types';
import { MonthGrid } from './MonthGrid';
import { WeekdayRow } from './WeekdayRow';
import { spacing } from '../../theme';
import { MONTH_ABBREV_EN, monthNameLongEn } from '../../utils';
import { Touchable } from '../../ui/Touchable';

const MONTH_KEY_DD = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const;

const EMPTY_MONTH_ENTRIES: Record<string, MoodEntry> = Object.freeze({});

export type CalendarMoodStyleDotFill = 'dot' | 'fill';

const layoutStyles = StyleSheet.create({
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
});

type MiniMonthCardProps = {
  y: number;
  mIdx: number;
  monthEntries: Record<string, MoodEntry>;
  entriesRevision: number;
  /** Bumps on year-view focus so virtualized rows refresh (today / mood correctness). */
  yearRecycleEpoch: number;
  calendarMoodStyle: CalendarMoodStyleDotFill;
  todayKey: string;
  moodGradeColorStyle: MoodGradeColorStyle;
  isDark: boolean;
  cardWidthStyle: { width: number };
  marginStyle: { marginRight: number };
  monthTitleStyle: TextStyle;
  miniMonthTitleMaxFontMult: number;
  onOpenMonth: (y: number, mIdx: number) => void;
};

const MiniMonthCard = React.memo(
  function MiniMonthCard({
    y,
    mIdx,
    monthEntries,
    entriesRevision,
    yearRecycleEpoch,
    calendarMoodStyle,
    todayKey,
    moodGradeColorStyle,
    isDark,
    cardWidthStyle,
    marginStyle,
    monthTitleStyle,
    miniMonthTitleMaxFontMult,
    onOpenMonth,
  }: MiniMonthCardProps) {
    const handlePress = useCallback(() => onOpenMonth(y, mIdx), [mIdx, onOpenMonth, y]);
    const label = MONTH_ABBREV_EN[mIdx] ?? '';
    const fullLabel = monthNameLongEn(mIdx);
    return (
      <Touchable
        style={[layoutStyles.miniMonth, cardWidthStyle, marginStyle]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Open ${fullLabel} ${y}`}
        accessibilityHint="Opens month view"
      >
        <Text style={monthTitleStyle} allowFontScaling maxFontSizeMultiplier={miniMonthTitleMaxFontMult}>
          {label}
        </Text>
        <WeekdayRow variant="mini" />
        <MonthGrid
          year={y}
          monthIndex0={mIdx}
          variant="mini"
          entries={monthEntries}
          entriesRevision={entriesRevision}
          recycleGuardEpoch={yearRecycleEpoch}
          calendarMoodStyle={calendarMoodStyle}
          todayKey={todayKey}
          moodGradeColorStyle={moodGradeColorStyle}
          isDark={isDark}
        />
      </Touchable>
    );
  },
  (a, b) =>
    a.y === b.y &&
    a.mIdx === b.mIdx &&
    a.monthEntries === b.monthEntries &&
    a.entriesRevision === b.entriesRevision &&
    a.yearRecycleEpoch === b.yearRecycleEpoch &&
    a.calendarMoodStyle === b.calendarMoodStyle &&
    a.todayKey === b.todayKey &&
    a.moodGradeColorStyle === b.moodGradeColorStyle &&
    a.isDark === b.isDark &&
    a.cardWidthStyle.width === b.cardWidthStyle.width &&
    a.marginStyle.marginRight === b.marginStyle.marginRight &&
    a.miniMonthTitleMaxFontMult === b.miniMonthTitleMaxFontMult &&
    a.monthTitleStyle === b.monthTitleStyle &&
    a.onOpenMonth === b.onOpenMonth
);

export type YearOverviewPageProps = {
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
  yearRecycleEpoch: number;
  calendarMoodStyle: CalendarMoodStyleDotFill;
  todayKey: string;
  moodGradeColorStyle: MoodGradeColorStyle;
  isDark: boolean;
  monthTitleStyle: TextStyle;
  miniMonthTitleMaxFontMult: number;
  onOpenMonth: (y: number, mIdx: number) => void;
};

function yearOverviewPagePropsEqual(a: YearOverviewPageProps, b: YearOverviewPageProps): boolean {
  if (a.y !== b.y) return false;
  if (a.entriesRevision !== b.entriesRevision) return false;
  if (a.yearRecycleEpoch !== b.yearRecycleEpoch) return false;
  if (a.todayKey !== b.todayKey) return false;
  if (a.calendarMoodStyle !== b.calendarMoodStyle) return false;
  if (a.moodGradeColorStyle !== b.moodGradeColorStyle) return false;
  if (a.isDark !== b.isDark) return false;
  if (a.onOpenMonth !== b.onOpenMonth) return false;
  if (a.monthTitleStyle !== b.monthTitleStyle) return false;
  if (a.miniMonthTitleMaxFontMult !== b.miniMonthTitleMaxFontMult) return false;
  if (a.yearPageStyle !== b.yearPageStyle) return false;
  if (a.gridWrapperPadStyle !== b.gridWrapperPadStyle) return false;
  if (a.gridHorizontalPadStyle !== b.gridHorizontalPadStyle) return false;
  if (a.miniMonthWidthStyle !== b.miniMonthWidthStyle) return false;
  if (a.miniMonthMarginRightStyle !== b.miniMonthMarginRightStyle) return false;
  if (a.miniMonthMarginZeroStyle !== b.miniMonthMarginZeroStyle) return false;
  if (a.monthIndices !== b.monthIndices) return false;

  for (let i = 0; i < 12; i++) {
    const mIdx = a.monthIndices[i];
    if (mIdx !== b.monthIndices[i]) return false;
    const mk = `${a.y}-${MONTH_KEY_DD[mIdx]}`;
    const ae = a.entriesByMonthKey[mk] ?? EMPTY_MONTH_ENTRIES;
    const be = b.entriesByMonthKey[mk] ?? EMPTY_MONTH_ENTRIES;
    if (ae !== be) return false;
  }
  return true;
}

export const YearOverviewPage = React.memo(function YearOverviewPage({
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
  yearRecycleEpoch,
  calendarMoodStyle,
  todayKey,
  moodGradeColorStyle,
  isDark,
  monthTitleStyle,
  miniMonthTitleMaxFontMult,
  onOpenMonth,
}: YearOverviewPageProps) {
  return (
    <View style={yearPageStyle}>
      <View style={[layoutStyles.gridWrapper, gridWrapperPadStyle]}>
        <View style={[layoutStyles.grid, gridHorizontalPadStyle]}>
          {monthIndices.map((mIdx) => {
            const mk = `${y}-${MONTH_KEY_DD[mIdx]}`;
            const monthEntries = entriesByMonthKey[mk] ?? EMPTY_MONTH_ENTRIES;
            const isEndOfRow = (mIdx + 1) % 3 === 0;
            return (
              <MiniMonthCard
                key={`${y}-${mIdx}`}
                y={y}
                mIdx={mIdx}
                monthEntries={monthEntries}
                entriesRevision={entriesRevision}
                yearRecycleEpoch={yearRecycleEpoch}
                calendarMoodStyle={calendarMoodStyle}
                todayKey={todayKey}
                moodGradeColorStyle={moodGradeColorStyle}
                isDark={isDark}
                cardWidthStyle={miniMonthWidthStyle}
                marginStyle={isEndOfRow ? miniMonthMarginZeroStyle : miniMonthMarginRightStyle}
                monthTitleStyle={monthTitleStyle}
                miniMonthTitleMaxFontMult={miniMonthTitleMaxFontMult}
                onOpenMonth={onOpenMonth}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}, yearOverviewPagePropsEqual);
