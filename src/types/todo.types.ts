/**
 * @fileoverview Task/reminder models.
 * @module types/todo.types
 */

/** Title clamp matches mood note normalization in storage (`normalizeNote`). */
export const MAX_DAY_TODO_TITLE_LEN = 200;

/** Hard cap on tasks stored per calendar day (AsyncStorage size + UX). */
export const DAY_TODO_MAX_ITEMS_PER_DAY = 100;

/** One task for a specific calendar day (`YYYY-MM-DD`). */
export type DayTodoItem = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  /** Stable ordering within the day (lower = earlier in the list). */
  sortIndex: number;
  /**
   * Optional time-of-day cue for this day (minutes from local midnight, 0–1439).
   * In-app only; does not schedule OS notifications.
   */
  reminderMinutes: number | null;
};

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'open' | 'completed' | 'archived';
export type TaskRecurrenceFrequency = 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'custom';

export type TaskReminder = {
  id: string;
  kind: 'timeOfDay';
  /** Local calendar day (`YYYY-MM-DD`) the reminder belongs to. */
  date: string;
  /** In-app time cue. OS notifications are intentionally not scheduled in this foundation slice. */
  minutesFromMidnight: number;
  createdAt: number;
};

export type TaskRecurrence = {
  id: string;
  frequency: TaskRecurrenceFrequency;
  interval: number;
  /** Local day this rule starts applying. */
  startDate: string;
  /** Optional local day where recurrence stops. */
  endDate: string | null;
  /** 0-6, Sunday-first, for weekly/custom weekly recurrences. */
  weekdays: number[];
  /** Last generated occurrence local day. Prevents duplicate generation. */
  lastGeneratedDate: string | null;
};

export type TaskSubtask = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  completedAt: number | null;
  sortIndex: number;
};

export type TaskTag = {
  id: string;
  title: string;
  color: string | null;
  createdAt: number;
  updatedAt: number;
};

export type TaskHistoryEventType = 'created' | 'completed' | 'reopened' | 'archived' | 'updated' | 'recurrenceGenerated';

export type TaskHistory = {
  id: string;
  taskId: string;
  type: TaskHistoryEventType;
  at: number;
  /** Metadata-only note for app-generated history, never user note text. */
  note: string | null;
};

export type TaskList = {
  id: string;
  title: string;
  color: string | null;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
  sortIndex: number;
};

export type Task = {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  listId: string | null;
  tagIds: string[];
  subtasks: TaskSubtask[];
  reminders: TaskReminder[];
  recurrence: TaskRecurrence | null;
  /** Local due day; day-scoped reminders use this to preserve existing behavior. */
  dueDate: string | null;
  /** Existing per-day reminder ordering. */
  sortIndex: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  archivedAt: number | null;
  /** Compatibility marker for rows migrated from `kairo.dayTodos`. */
  source: 'dayTodo' | 'task';
};

export type TasksRecord = {
  version: 1;
  tasksById: Record<string, Task>;
  listsById: Record<string, TaskList>;
  tagsById: Record<string, TaskTag>;
  historyByTaskId: Record<string, TaskHistory[]>;
  migratedLegacyDayTodosAt: number | null;
};
