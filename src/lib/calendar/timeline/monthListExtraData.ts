/**
 * @fileoverview extraData payload for FlashList month timeline (forces cell recycle refresh).
 * @module lib/calendar/timeline/monthListExtraData
 */

import type { FullGridMetrics } from '../../../components/calendar/fullGridLayout';
import type { CalendarMoodStyle, MoodEntry, MoodGradeColorStyle } from '../../../types';

export type CalendarMonthListExtraData = {
  selectedDate: string;
  todayKey: string;
  calendarMoodStyle: CalendarMoodStyle;
  entriesByMonthKey: Record<string, Record<string, MoodEntry>>;
  fullGridLayout: FullGridMetrics;
  entriesRevision: number;
  calendarListEpoch: number;
  moodGradeColorStyle: MoodGradeColorStyle;
  isDark: boolean;
};

export function buildCalendarMonthListExtraData(parts: CalendarMonthListExtraData): CalendarMonthListExtraData {
  return parts;
}
