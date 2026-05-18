/**
 * @fileoverview Read-only “Daily Activity” DTO — composed view over domain stores.
 * @module types/dailyActivity.types
 *
 * **Source of truth** remains: `moodly.entries`, `moodly.habitSelections`, `moodly.goals`,
 * `moodly.tasks` day shards, etc. This module defines only the **projection** shape.
 */

import type { HabitId } from './habits.types';
import type { MoodGrade } from './mood.types';
import type { GoalType, GoalStatus } from './goals.types';

/** Local calendar day key (`YYYY-MM-DD`). Same contract as mood / tasks / goals history dates. */
export type LocalDateKey = string;

/** Mood facet — derived from `moodly.entries` only (no copy of long notes in metadata logs). */
export type DayActivityMoodSection = {
  present: boolean;
  grade: MoodGrade | null;
  /** True when an entry row exists for this date (even if grade is recoverable). */
  hasEntry: boolean;
};

/**
 * Journal facet — same underlying row as mood (`MoodEntry`); split for stable DTO evolution.
 * **Note text** is included only where the journal domain already exposes it to callers building UI;
 * repositories may omit note in logs (metadata-only).
 */
export type DayActivityJournalSection = {
  present: boolean;
  /** Truncated length cap matches mood note storage policy; empty string when absent. */
  notePreview: string;
  updatedAt: number | null;
};

export type DayActivityHabitsSection = {
  /** Habits marked “on” for this local day (`moodly.habitSelections`). */
  selectedIds: readonly HabitId[];
  /** Catalog ids configured for the strip (`moodly.trackedHabits`). */
  trackedIds: readonly HabitId[];
};

export type DayActivityGoalItem = {
  id: string;
  title: string;
  type: GoalType;
  status: GoalStatus;
  percent: number;
  streak: number;
  completedToday: boolean;
  /** Merged-history value for this calendar day, if any. */
  valueOnDate: number | null;
};

export type DayActivityGoalsSection = {
  items: readonly DayActivityGoalItem[];
};

export type DayActivityReminderItem = {
  id: string;
  title: string;
  done: boolean;
  sortIndex: number;
  reminderMinutes: number | null;
};

export type DayActivityRemindersSection = {
  /** Day-scoped reminders from `moodly.tasks.day.<YYYY-MM-DD>` (normalized task surface). */
  items: readonly DayActivityReminderItem[];
};

export type DayActivityCalendarSection = {
  /** `YYYY-MM` month bucket for this date (for snapshot-style consumers). */
  monthKey: string;
  /** Whether a mood entry exists (calendar cell coloring uses mood elsewhere). */
  hasMoodEntry: boolean;
  moodGrade: MoodGrade | null;
};

export type DayActivitySummarySection = {
  /** Counts only — no user-facing strings (callers compose copy). */
  counts: {
    mood: 0 | 1;
    journalNote: 0 | 1;
    habits: number;
    goalsWithProgress: number;
    reminders: number;
  };
  /** True if any facet has meaningful activity for this day. */
  hasAnyActivity: boolean;
};

export type DayActivityMetadata = {
  composedAt: number;
  /** Local date this row describes (echo). */
  date: LocalDateKey;
  /** When range requests exceed the hard cap, extra days are omitted. */
  rangeTruncated?: boolean;
  /** Structural issues (invalid keys, clamped range); never includes journal text. */
  warnings: readonly string[];
};

/**
 * Composed read model for one local day. **Read-only** — mutations stay on domain repositories.
 */
export type DayActivity = {
  date: LocalDateKey;
  mood: DayActivityMoodSection;
  journal: DayActivityJournalSection;
  habits: DayActivityHabitsSection;
  goals: DayActivityGoalsSection;
  reminders: DayActivityRemindersSection;
  calendar: DayActivityCalendarSection;
  summary: DayActivitySummarySection;
  metadata: DayActivityMetadata;
};
