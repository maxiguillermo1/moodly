/**
 * @fileoverview One month row in the calendar timeline (FlashList item).
 * Memoized so sibling months skip re-render when selection or data for other months changes.
 * @module components/calendar/CalendarTimelineMonth
 */

import React from 'react';
import { View, Text, type LayoutChangeEvent, type TextStyle, type ViewStyle } from 'react-native';

import type { MoodEntry } from '../../types';
import type { MoodGradeColorStyle } from '../../types/settings.types';
import type { CalendarMoodStyle } from './MonthGrid';
import type { FullGridMetrics } from './fullGridLayout';
import { MonthGrid } from './MonthGrid';
import { WeekdayRow } from './WeekdayRow';
import { monthNameLongEn, type MonthItem } from '../../utils';

export type CalendarTimelineMonthStyles = {
  monthSection: ViewStyle;
  monthSectionTitle: TextStyle;
  calendarCard: ViewStyle;
};

export type CalendarTimelineMonthProps = {
  item: MonthItem;
  monthEntries: Record<string, MoodEntry>;
  entriesRevision: number;
  selectedForThisMonth?: string;
  monthSectionTopPad: number;
  monthSectionBottomPad: number;
  monthCardPadding: number;
  fullGridMetrics: FullGridMetrics;
  calendarMoodStyle: CalendarMoodStyle;
  todayKey: string;
  onPressDate: (isoDate: string) => void | Promise<void>;
  reduceMotion: boolean;
  onHapticSelect: () => void;
  moodGradeColorStyle: MoodGradeColorStyle;
  isDark: boolean;
  onCalendarCardInnerLayout: (e: LayoutChangeEvent) => void;
  monthSectionTitleMaxFontMult: number;
  /** Bumped on calendar focus so recycled list rows refresh rings/selection. */
  calendarListEpoch: number;
  styles: CalendarTimelineMonthStyles;
};

function timelineMonthPropsEqual(a: CalendarTimelineMonthProps, b: CalendarTimelineMonthProps): boolean {
  return (
    a.item.key === b.item.key &&
    a.monthEntries === b.monthEntries &&
    a.entriesRevision === b.entriesRevision &&
    a.selectedForThisMonth === b.selectedForThisMonth &&
    a.monthSectionTopPad === b.monthSectionTopPad &&
    a.monthSectionBottomPad === b.monthSectionBottomPad &&
    a.monthCardPadding === b.monthCardPadding &&
    a.fullGridMetrics === b.fullGridMetrics &&
    a.calendarMoodStyle === b.calendarMoodStyle &&
    a.todayKey === b.todayKey &&
    a.onPressDate === b.onPressDate &&
    a.reduceMotion === b.reduceMotion &&
    a.onHapticSelect === b.onHapticSelect &&
    a.moodGradeColorStyle === b.moodGradeColorStyle &&
    a.isDark === b.isDark &&
    a.onCalendarCardInnerLayout === b.onCalendarCardInnerLayout &&
    a.monthSectionTitleMaxFontMult === b.monthSectionTitleMaxFontMult &&
    a.calendarListEpoch === b.calendarListEpoch &&
    a.styles === b.styles
  );
}

export const CalendarTimelineMonth = React.memo(function CalendarTimelineMonth({
  item,
  monthEntries,
  entriesRevision,
  selectedForThisMonth,
  monthSectionTopPad,
  monthSectionBottomPad,
  monthCardPadding,
  fullGridMetrics,
  calendarMoodStyle,
  todayKey,
  onPressDate,
  reduceMotion,
  onHapticSelect,
  moodGradeColorStyle,
  isDark,
  onCalendarCardInnerLayout,
  monthSectionTitleMaxFontMult,
  calendarListEpoch,
  styles: s,
}: CalendarTimelineMonthProps) {
  const title = monthNameLongEn(item.m);
  return (
    <View
      style={[
        s.monthSection,
        { paddingTop: monthSectionTopPad, paddingBottom: monthSectionBottomPad },
      ]}
      accessibilityRole="none"
    >
      <Text
        style={s.monthSectionTitle}
        allowFontScaling
        maxFontSizeMultiplier={monthSectionTitleMaxFontMult}
        accessibilityRole="header"
        accessibilityLabel={`${title} ${item.y}`}
      >
        {title}
      </Text>
      <View
        style={[s.calendarCard, { padding: monthCardPadding }]}
        onLayout={onCalendarCardInnerLayout}
      >
        <WeekdayRow variant="full" fullGridLayout={fullGridMetrics} />
        <MonthGrid
          year={item.y}
          monthIndex0={item.m}
          variant="full"
          entries={monthEntries}
          entriesRevision={entriesRevision}
          calendarMoodStyle={calendarMoodStyle}
          todayKey={todayKey}
          selectedDate={selectedForThisMonth}
          onPressDate={onPressDate}
          reduceMotion={reduceMotion}
          onHapticSelect={onHapticSelect}
          fullGridLayout={fullGridMetrics}
          moodGradeColorStyle={moodGradeColorStyle}
          isDark={isDark}
          recycleGuardEpoch={calendarListEpoch}
        />
      </View>
    </View>
  );
}, timelineMonthPropsEqual);
