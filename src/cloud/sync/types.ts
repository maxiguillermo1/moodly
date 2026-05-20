/**
 * @fileoverview Cloud sync domain types and outbox operation shapes.
 * @module cloud/sync/types
 */

import type { AppSettings } from '../../types/settings.types';
import type { MoodEntry } from '../../types/mood.types';
import type { GoalsRecord } from '../../types/goals.types';
import type { HabitId } from '../../lib/constants/habitsCatalog';
import type { TasksRecord } from '../../types/todo.types';
import type { DayTodoItem } from '../../types/todo.types';

export type SyncStatus = 'idle' | 'syncing' | 'saved' | 'offline' | 'error';

export type HabitSelectionsSnapshot = Record<string, HabitId[]>;

export type SyncOperationInput =
  | { kind: 'mood_upsert'; entry: MoodEntry; id?: string; enqueuedAtMs?: number }
  | { kind: 'mood_delete'; date: string; id?: string; enqueuedAtMs?: number }
  | { kind: 'habits_snapshot'; selections: HabitSelectionsSnapshot; id?: string; enqueuedAtMs?: number }
  | { kind: 'tracked_habits_snapshot'; habitIds: HabitId[]; id?: string; enqueuedAtMs?: number }
  | { kind: 'goals_snapshot'; record: GoalsRecord; id?: string; enqueuedAtMs?: number }
  | { kind: 'settings_snapshot'; settings: AppSettings; id?: string; enqueuedAtMs?: number }
  | { kind: 'tasks_snapshot'; record: TasksRecord; id?: string; enqueuedAtMs?: number }
  | { kind: 'task_day_snapshot'; date: string; items: DayTodoItem[]; id?: string; enqueuedAtMs?: number }
  | { kind: 'insights_timing_snapshot'; payload: Record<string, unknown>; id?: string; enqueuedAtMs?: number };

export type SyncOperation = SyncOperationInput & { id: string; enqueuedAtMs: number };

export type CloudPullResult = {
  pulledAtMs: number;
  moodCount: number;
  habitRowCount: number;
  goalCount: number;
};
