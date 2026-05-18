/**
 * @fileoverview Pure task model helpers and day-todo compatibility mapping.
 * @module lib/todos/taskModel
 */

import type { DayTodoItem, Task, TaskPriority, TaskRecurrence, TaskReminder } from '../../types';
import { isValidISODateKey, normalizeNote } from '../../data/model/entry';

export function newTaskId(now: number = Date.now()): string {
  return `task-${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeTaskTitle(raw: string): string {
  return normalizeNote(raw);
}

export function taskReminderForDay(date: string, minutes: number | null, now: number = Date.now()): TaskReminder[] {
  if (minutes == null || !Number.isFinite(minutes)) return [];
  const m = Math.round(minutes);
  if (m < 0 || m >= 24 * 60 || !isValidISODateKey(date)) return [];
  return [{ id: `rem-${date}-${m}`, kind: 'timeOfDay', date, minutesFromMidnight: m, createdAt: now }];
}

export function createDayTask(params: {
  date: string;
  title: string;
  sortIndex: number;
  reminderMinutes?: number | null;
  id?: string;
  now?: number;
  priority?: TaskPriority;
}): Task {
  const now = params.now ?? Date.now();
  const title = normalizeTaskTitle(params.title);
  return {
    id: params.id ?? newTaskId(now),
    title,
    notes: '',
    status: 'open',
    priority: params.priority ?? 'medium',
    listId: null,
    tagIds: [],
    subtasks: [],
    reminders: taskReminderForDay(params.date, params.reminderMinutes ?? null, now),
    recurrence: null,
    dueDate: params.date,
    sortIndex: params.sortIndex,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    archivedAt: null,
    source: 'dayTodo',
  };
}

export function taskToDayTodoItem(task: Task): DayTodoItem | null {
  if (!task.dueDate || task.status === 'archived') return null;
  const reminder = task.reminders.find((r) => r.date === task.dueDate) ?? null;
  return {
    id: task.id,
    title: task.title,
    done: task.status === 'completed',
    createdAt: task.createdAt,
    sortIndex: task.sortIndex,
    reminderMinutes: reminder?.minutesFromMidnight ?? null,
  };
}

export function dayTodoItemToTask(date: string, item: DayTodoItem): Task | null {
  if (!isValidISODateKey(date)) return null;
  const task = createDayTask({
    date,
    title: item.title,
    sortIndex: item.sortIndex,
    reminderMinutes: item.reminderMinutes,
    id: item.id,
    now: item.createdAt,
  });
  task.status = item.done ? 'completed' : 'open';
  task.completedAt = item.done ? item.createdAt : null;
  task.updatedAt = item.createdAt;
  return task;
}

function toDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

function toKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  const start = toDate(a);
  const end = toDate(b);
  start.setHours(12, 0, 0, 0);
  end.setHours(12, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function lastDayOfMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

export function nextRecurrenceDate(recurrence: TaskRecurrence, fromDate: string): string | null {
  if (!isValidISODateKey(fromDate)) return null;
  const interval = Math.max(1, Math.floor(recurrence.interval || 1));
  if (recurrence.frequency === 'monthly') {
    const base = toDate(fromDate);
    const targetMonth = base.getMonth() + interval;
    const target = new Date(base.getFullYear(), targetMonth, 1);
    const clampedDay = Math.min(base.getDate(), lastDayOfMonth(target.getFullYear(), target.getMonth()));
    target.setDate(clampedDay);
    const out = toKey(target);
    if (recurrence.endDate && out > recurrence.endDate) return null;
    return out;
  }

  const cursor = toDate(fromDate);
  const allowedWeekdays = new Set(recurrence.weekdays);
  for (let guard = 0; guard < 740; guard += 1) {
    cursor.setDate(cursor.getDate() + 1);
    const out = toKey(cursor);
    if (recurrence.endDate && out > recurrence.endDate) return null;
    if (recurrence.frequency === 'daily') {
      if (daysBetween(fromDate, out) >= interval) return out;
    } else if (recurrence.frequency === 'weekdays') {
      if (cursor.getDay() !== 0 && cursor.getDay() !== 6) return out;
    } else {
      const weekDelta = Math.floor(Math.max(0, daysBetween(recurrence.startDate, out)) / 7);
      const weekdayOk = allowedWeekdays.size === 0 || allowedWeekdays.has(cursor.getDay());
      if (weekdayOk && weekDelta % interval === 0) return out;
    }
  }
  return null;
}
