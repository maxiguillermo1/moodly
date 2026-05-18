/**
 * @fileoverview Repository façade for per-day extensions (habits + reminders lists).
 * @module data/repositories/extensionsRepository
 *
 * **Configuration** (which extensions appear) lives in {@link settingsRepository} /
 * `AppSettings`. **Values** here are per-`YYYY-MM-DD` payloads suitable for future
 * `extension_events` / `day_reminders` tables.
 */

export * from '../storage/habitSelectionsStorage';
export * from '../storage/habitTrackingStorage';
export * from '../storage/dayTodosStorage';

import * as habitSelections from '../storage/habitSelectionsStorage';
import * as habitTracking from '../storage/habitTrackingStorage';
import * as dayTodos from '../storage/dayTodosStorage';

export const extensionsRepository = {
  habitSelections: {
    getHabitSelectionsForDate: habitSelections.getHabitSelectionsForDate,
    getHabitSelectionsRecordSnapshot: habitSelections.getHabitSelectionsRecordSnapshot,
    getHabitMarkedDayCounts: habitSelections.getHabitMarkedDayCounts,
    toggleHabitForDate: habitSelections.toggleHabitForDate,
    clearAllHabitSelections: habitSelections.clearAllHabitSelections,
  },
  habitTracking: {
    getTrackedHabitIds: habitTracking.getTrackedHabitIds,
    setTrackedHabitIds: habitTracking.setTrackedHabitIds,
  },
  dayReminders: {
    getDayTodosForDate: dayTodos.getDayTodosForDate,
    addDayTodo: dayTodos.addDayTodo,
    setDayTodoDone: dayTodos.setDayTodoDone,
    setDayTodoReminder: dayTodos.setDayTodoReminder,
    deleteDayTodo: dayTodos.deleteDayTodo,
    clearCompletedDayTodos: dayTodos.clearCompletedDayTodos,
    reorderOpenDayTodos: dayTodos.reorderOpenDayTodos,
  },
} as const;

export type IExtensionsRepository = typeof extensionsRepository;
