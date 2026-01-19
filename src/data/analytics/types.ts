/**
 * @fileoverview Analytics-ready derived types (pure, deterministic).
 * @module data/analytics/types
 */

import type { MoodGrade } from '../../types';

export type MoodScore = 0 | 1 | 2 | 3 | 4 | 5;

export type DailyRow = {
  date: string; // YYYY-MM-DD
  y: number;
  m: number; // 1..12
  d: number; // 1..31
  hasEntry: boolean;
  mood?: MoodGrade;
  moodScore?: MoodScore;
  noteLen?: number;
  createdAt?: number;
  updatedAt?: number;
};

export type MoodDistribution = Record<MoodGrade, number>;

export type MonthlyAggregate = {
  monthKey: string; // YYYY-MM
  y: number;
  m: number; // 1..12
  daysWithEntry: number;
  avgMoodScore: number | null;
  distribution: MoodDistribution;
  notesCount: number;
  totalNoteChars: number;
};

export type WeeklyAggregate = {
  weekKey: string; // YYYY-Www (ISO week)
  isoYear: number;
  isoWeek: number;
  daysWithEntry: number;
  avgMoodScore: number | null;
  distribution: MoodDistribution;
};

export type Streaks = {
  currentStreakDays: number;
  longestStreakDays: number;
};

