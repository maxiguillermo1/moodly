/**
 * @fileoverview Journal list section types (grouped SectionList / FlashList).
 * @module lib/journal/journalSections.types
 */

import type { MoodGrade } from '../../types';

export type JournalViewMode = 'newest' | 'oldest' | 'byMonth' | 'byDay' | 'byMood';

export type JournalListSection = {
  key: string;
  title: string;
  subtitle: string;
  kind: 'month' | 'day' | 'mood';
  isFirst: boolean;
  moodGrade?: MoodGrade;
  /** `YYYY-MM` local month key when {@link JournalListSection.kind} is `'month'`. */
  monthKey?: string;
  /** Monday = 0 … Sunday = 6 when {@link JournalListSection.kind} is `'day'`. */
  weekdayIndex0?: number;
  data: import('../../types').MoodEntry[];
};
