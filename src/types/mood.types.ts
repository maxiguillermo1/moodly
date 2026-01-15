/**
 * @fileoverview Core type definitions for mood tracking domain
 * @module types/mood
 */

/** Mood grade literals - academic-style rating system */
export type MoodGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

/** Single mood entry stored per day */
export interface MoodEntry {
  /** Date in ISO format: "YYYY-MM-DD" */
  date: string;
  /** Selected mood grade */
  mood: MoodGrade;
  /** Optional one-line reflection */
  note: string;
  /** Unix timestamp (ms) when entry was first created */
  createdAt: number;
  /** Unix timestamp (ms) when entry was last modified */
  updatedAt: number;
}

/** Storage format: keyed by date for O(1) lookups */
export type MoodEntriesRecord = Record<string, MoodEntry>;

/** Mood metadata for UI rendering */
export interface MoodConfig {
  grade: MoodGrade;
  label: string;
  color: string;
  emoji: string;
}

/** Stats computed from mood entries */
export interface MoodStats {
  grade: MoodGrade;
  count: number;
  percent: number;
}
