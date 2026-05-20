/**
 * @fileoverview Normalized local task/reminder storage with legacy day-todo migration.
 * @module data/storage/tasksStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DayTodoItem, Task, TaskHistory, TaskList, TaskRecurrence, TaskSubtask, TaskTag, TasksRecord } from '../../types';
import { DAY_TODO_MAX_ITEMS_PER_DAY } from '../../types';
import { logger } from '../../lib/security/logger';
import { isValidISODateKey } from '../model/entry';
import { assertLocalPersistenceWritable, ensureLocalPersistenceReady } from '../persistence/bootstrap';
import { storage } from './asyncStorage';
import { createDayTask, dayTodoItemToTask, nextRecurrenceDate, taskReminderForDay, taskToDayTodoItem } from '../../lib/todos/taskModel';

const STORAGE_KEY = 'moodly.tasks';
const CORRUPT_PREFIX = `${STORAGE_KEY}.corrupt.`;
const LEGACY_DAY_TODOS_KEY = 'moodly.dayTodos';
const LEGACY_CORRUPT_PREFIX = `${LEGACY_DAY_TODOS_KEY}.corrupt.`;
const DAY_SHARD_PREFIX = `${STORAGE_KEY}.day.`;
const DAY_INDEX_KEY = `${STORAGE_KEY}.dayIndex`;

type LegacyDayTodosRecord = Record<string, DayTodoItem[]>;

const EMPTY_RECORD: TasksRecord = Object.freeze({
  version: 1,
  tasksById: {},
  listsById: {},
  tagsById: {},
  historyByTaskId: {},
  migratedLegacyDayTodosAt: null,
});

let cache: TasksRecord | null = null;
let loadPromise: Promise<TasksRecord> | null = null;
let cacheGeneration = 0;
let writeTail: Promise<void> = Promise.resolve();
let cachedDayIndexRecord: TasksRecord | null = null;
let cachedTaskIdsByDate: Map<string, string[]> | null = null;
let dayShardCache = new Map<string, DayTodoItem[]>();
let dayIndexCache: string[] | null = null;

function cloneTask(task: Task): Task {
  return {
    ...task,
    tagIds: [...task.tagIds],
    subtasks: task.subtasks.map((s) => ({ ...s })),
    reminders: task.reminders.map((r) => ({ ...r })),
    recurrence: task.recurrence
      ? { ...task.recurrence, weekdays: [...task.recurrence.weekdays] }
      : null,
  };
}

function cloneRecord(record: TasksRecord): TasksRecord {
  const tasksById: Record<string, Task> = {};
  for (const [id, task] of Object.entries(record.tasksById)) tasksById[id] = cloneTask(task);
  const historyByTaskId: Record<string, TaskHistory[]> = {};
  for (const [id, history] of Object.entries(record.historyByTaskId)) {
    historyByTaskId[id] = history.map((event) => ({ ...event }));
  }
  return {
    version: 1,
    tasksById,
    listsById: Object.fromEntries(Object.entries(record.listsById).map(([id, list]) => [id, { ...list }])),
    tagsById: Object.fromEntries(Object.entries(record.tagsById).map(([id, tag]) => [id, { ...tag }])),
    historyByTaskId,
    migratedLegacyDayTodosAt: record.migratedLegacyDayTodosAt,
  };
}

function cloneDayItem(item: DayTodoItem): DayTodoItem {
  return { ...item };
}

function sortDayItems(items: readonly DayTodoItem[]): DayTodoItem[] {
  return [...items].sort((a, b) => a.sortIndex - b.sortIndex || a.createdAt - b.createdAt);
}

function normalizeDayShardItem(raw: unknown, fallbackSort: number): DayTodoItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : null;
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!id || !title) return null;
  const createdAt = typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) ? o.createdAt : Date.now();
  const sortIndex = typeof o.sortIndex === 'number' && Number.isFinite(o.sortIndex) ? Math.floor(o.sortIndex) : fallbackSort;
  const rm = typeof o.reminderMinutes === 'number' && Number.isFinite(o.reminderMinutes) ? Math.round(o.reminderMinutes) : null;
  return {
    id,
    title,
    done: o.done === true,
    createdAt,
    sortIndex,
    reminderMinutes: rm != null && rm >= 0 && rm < 24 * 60 ? rm : null,
  };
}

function parseDayShard(json: string | null): DayTodoItem[] | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return [];
    return sortDayItems(
      raw.map((item, index) => normalizeDayShardItem(item, index)).filter((item): item is DayTodoItem => !!item)
    ).slice(0, DAY_TODO_MAX_ITEMS_PER_DAY);
  } catch {
    return [];
  }
}

async function getDayIndex(): Promise<string[]> {
  if (dayIndexCache) return [...dayIndexCache];
  try {
    const raw = await storage.getItem(DAY_INDEX_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    dayIndexCache = Array.isArray(parsed)
      ? parsed.filter((date): date is string => typeof date === 'string' && isValidISODateKey(date))
      : [];
    return [...dayIndexCache];
  } catch {
    dayIndexCache = [];
    return [];
  }
}

async function persistDayIndex(dates: readonly string[]): Promise<void> {
  const next = [...new Set(dates.filter(isValidISODateKey))].sort();
  await storage.setItem(DAY_INDEX_KEY, JSON.stringify(next));
  dayIndexCache = next;
}

async function ensureDateInDayIndex(date: string): Promise<void> {
  const index = await getDayIndex();
  if (!index.includes(date)) await persistDayIndex([...index, date]);
}

async function persistDayShardData(date: string, items: readonly DayTodoItem[]): Promise<void> {
  await ensureLocalPersistenceReady();
  assertLocalPersistenceWritable();
  const safeItems = sortDayItems(items).slice(0, DAY_TODO_MAX_ITEMS_PER_DAY).map(cloneDayItem);
  await storage.setItem(`${DAY_SHARD_PREFIX}${date}`, JSON.stringify(safeItems));
  dayShardCache.set(date, safeItems);
}

async function persistDayShard(date: string, items: readonly DayTodoItem[]): Promise<void> {
  await persistDayShardData(date, items);
  await ensureDateInDayIndex(date);
}

function normalizeSubtask(raw: unknown, fallbackSort: number, createdAt: number): TaskSubtask | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : null;
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!id || !title) return null;
  return {
    id,
    title,
    done: o.done === true,
    createdAt: typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) ? o.createdAt : createdAt,
    completedAt: typeof o.completedAt === 'number' && Number.isFinite(o.completedAt) ? o.completedAt : null,
    sortIndex: typeof o.sortIndex === 'number' && Number.isFinite(o.sortIndex) ? Math.floor(o.sortIndex) : fallbackSort,
  };
}

function normalizeRecurrence(raw: unknown): TaskRecurrence | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : null;
  const frequency =
    o.frequency === 'daily' ||
    o.frequency === 'weekly' ||
    o.frequency === 'weekdays' ||
    o.frequency === 'monthly' ||
    o.frequency === 'custom'
      ? o.frequency
      : null;
  const startDate = typeof o.startDate === 'string' && isValidISODateKey(o.startDate) ? o.startDate : null;
  if (!id || !frequency || !startDate) return null;
  const endDate = typeof o.endDate === 'string' && isValidISODateKey(o.endDate) ? o.endDate : null;
  const lastGeneratedDate =
    typeof o.lastGeneratedDate === 'string' && isValidISODateKey(o.lastGeneratedDate) ? o.lastGeneratedDate : null;
  return {
    id,
    frequency,
    interval: typeof o.interval === 'number' && Number.isFinite(o.interval) ? Math.max(1, Math.floor(o.interval)) : 1,
    startDate,
    endDate,
    weekdays: Array.isArray(o.weekdays)
      ? o.weekdays.filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6).map((d) => Math.floor(d))
      : [],
    lastGeneratedDate,
  };
}

function normalizeList(raw: unknown): TaskList | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : null;
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!id || !title) return null;
  const createdAt = typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) ? o.createdAt : Date.now();
  return {
    id,
    title,
    color: typeof o.color === 'string' ? o.color : null,
    archived: o.archived === true,
    createdAt,
    updatedAt: typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt) ? o.updatedAt : createdAt,
    sortIndex: typeof o.sortIndex === 'number' && Number.isFinite(o.sortIndex) ? Math.floor(o.sortIndex) : 0,
  };
}

function normalizeTag(raw: unknown): TaskTag | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : null;
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!id || !title) return null;
  const createdAt = typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) ? o.createdAt : Date.now();
  return {
    id,
    title,
    color: typeof o.color === 'string' ? o.color : null,
    createdAt,
    updatedAt: typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt) ? o.updatedAt : createdAt,
  };
}

function normalizeHistory(raw: unknown, taskId: string): TaskHistory | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : null;
  const type =
    o.type === 'created' ||
    o.type === 'completed' ||
    o.type === 'reopened' ||
    o.type === 'archived' ||
    o.type === 'updated' ||
    o.type === 'recurrenceGenerated'
      ? o.type
      : null;
  if (!id || !type) return null;
  return {
    id,
    taskId,
    type,
    at: typeof o.at === 'number' && Number.isFinite(o.at) ? o.at : Date.now(),
    note: typeof o.note === 'string' ? o.note.slice(0, 120) : null,
  };
}

function normalizeTask(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : null;
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  const dueDate = typeof o.dueDate === 'string' && isValidISODateKey(o.dueDate) ? o.dueDate : null;
  if (!id || !title) return null;
  const status = o.status === 'completed' || o.status === 'archived' ? o.status : 'open';
  const priority =
    o.priority === 'low' || o.priority === 'high' || o.priority === 'urgent' ? o.priority : 'medium';
  const createdAt = typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) ? o.createdAt : Date.now();
  const updatedAt = typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt) ? o.updatedAt : createdAt;
  const sortIndex = typeof o.sortIndex === 'number' && Number.isFinite(o.sortIndex) ? Math.floor(o.sortIndex) : 0;
  const reminders = Array.isArray(o.reminders)
    ? o.reminders
        .map((r) => {
          if (!r || typeof r !== 'object') return null;
          const ro = r as Record<string, unknown>;
          const date = typeof ro.date === 'string' && isValidISODateKey(ro.date) ? ro.date : null;
          const m = typeof ro.minutesFromMidnight === 'number' ? Math.round(ro.minutesFromMidnight) : null;
          if (!date || m == null || m < 0 || m >= 24 * 60) return null;
          return {
            id: typeof ro.id === 'string' && ro.id.length > 0 ? ro.id : `rem-${date}-${m}`,
            kind: 'timeOfDay' as const,
            date,
            minutesFromMidnight: m,
            createdAt: typeof ro.createdAt === 'number' && Number.isFinite(ro.createdAt) ? ro.createdAt : createdAt,
          };
        })
        .filter((r): r is NonNullable<typeof r> => !!r)
    : [];
  return {
    id,
    title,
    notes: typeof o.notes === 'string' ? o.notes : '',
    status,
    priority,
    listId: typeof o.listId === 'string' ? o.listId : null,
    tagIds: Array.isArray(o.tagIds) ? o.tagIds.filter((x): x is string => typeof x === 'string') : [],
    subtasks: Array.isArray(o.subtasks)
      ? o.subtasks.map((s, i) => normalizeSubtask(s, i, createdAt)).filter((s): s is TaskSubtask => !!s)
      : [],
    reminders,
    recurrence: normalizeRecurrence(o.recurrence),
    dueDate,
    sortIndex,
    createdAt,
    updatedAt,
    completedAt: typeof o.completedAt === 'number' ? o.completedAt : null,
    archivedAt: typeof o.archivedAt === 'number' ? o.archivedAt : null,
    source: o.source === 'task' ? 'task' : 'dayTodo',
  };
}

function parseTasksRecord(json: string | null): { record: TasksRecord; corrupt: boolean } {
  if (!json) return { record: cloneRecord(EMPTY_RECORD), corrupt: false };
  try {
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { record: cloneRecord(EMPTY_RECORD), corrupt: true };
    const o = raw as Record<string, unknown>;
    const tasksById: Record<string, Task> = {};
    const listsById: Record<string, TaskList> = {};
    const rawLists = o.listsById && typeof o.listsById === 'object' ? (o.listsById as Record<string, unknown>) : {};
    for (const [id, listRaw] of Object.entries(rawLists)) {
      const list = normalizeList({ ...(listRaw as Record<string, unknown>), id });
      if (list) listsById[list.id] = list;
    }
    const tagsById: Record<string, TaskTag> = {};
    const rawTags = o.tagsById && typeof o.tagsById === 'object' ? (o.tagsById as Record<string, unknown>) : {};
    for (const [id, tagRaw] of Object.entries(rawTags)) {
      const tag = normalizeTag({ ...(tagRaw as Record<string, unknown>), id });
      if (tag) tagsById[tag.id] = tag;
    }
    const historyByTaskId: Record<string, TaskHistory[]> = {};
    const rawHistory =
      o.historyByTaskId && typeof o.historyByTaskId === 'object' ? (o.historyByTaskId as Record<string, unknown>) : {};
    for (const [taskId, historyRaw] of Object.entries(rawHistory)) {
      if (!Array.isArray(historyRaw)) continue;
      const history = historyRaw.map((h) => normalizeHistory(h, taskId)).filter((h): h is TaskHistory => !!h);
      if (history.length > 0) historyByTaskId[taskId] = history.slice(-5000);
    }
    const rawTasks = o.tasksById && typeof o.tasksById === 'object' ? (o.tasksById as Record<string, unknown>) : {};
    for (const [id, taskRaw] of Object.entries(rawTasks)) {
      const task = normalizeTask({ ...(taskRaw as Record<string, unknown>), id });
      if (task) tasksById[task.id] = task;
    }
    return {
      record: {
        version: 1,
        tasksById,
        listsById,
        tagsById,
        historyByTaskId,
        migratedLegacyDayTodosAt:
          typeof o.migratedLegacyDayTodosAt === 'number' ? o.migratedLegacyDayTodosAt : null,
      },
      corrupt: false,
    };
  } catch {
    return { record: cloneRecord(EMPTY_RECORD), corrupt: true };
  }
}

function normalizeLegacyItem(raw: unknown, fallbackSort: number): DayTodoItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : null;
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!id || !title) return null;
  const createdAt = typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) ? o.createdAt : Date.now();
  const sortIndex = typeof o.sortIndex === 'number' && Number.isFinite(o.sortIndex) ? Math.floor(o.sortIndex) : fallbackSort;
  const rm = typeof o.reminderMinutes === 'number' ? Math.round(o.reminderMinutes) : null;
  return {
    id,
    title,
    done: o.done === true,
    createdAt,
    sortIndex,
    reminderMinutes: rm != null && rm >= 0 && rm < 24 * 60 ? rm : null,
  };
}

function parseLegacyDayTodos(json: string | null): { record: LegacyDayTodosRecord; corrupt: boolean } {
  if (!json) return { record: {}, corrupt: false };
  try {
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { record: {}, corrupt: true };
    const record: LegacyDayTodosRecord = {};
    for (const [date, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!isValidISODateKey(date) || !Array.isArray(value)) continue;
      const items = value
        .map((item, i) => normalizeLegacyItem(item, i))
        .filter((item): item is DayTodoItem => !!item)
        .slice(0, DAY_TODO_MAX_ITEMS_PER_DAY);
      if (items.length > 0) record[date] = items;
    }
    return { record, corrupt: false };
  } catch {
    return { record: {}, corrupt: true };
  }
}

async function quarantine(key: string, prefix: string, rawJson: string): Promise<void> {
  try {
    await storage.setItem(`${prefix}${Date.now()}`, rawJson);
  } catch (error) {
    logger.warn('storage.tasks.corruptBackup.persistFailed', { key, error });
  }
  try {
    await storage.setItem(key, JSON.stringify({}));
  } catch (error) {
    logger.error('storage.tasks.corruptReset.failed', { key, error });
  }
}

async function readFromDisk(): Promise<TasksRecord> {
  await ensureLocalPersistenceReady();
  const json = await storage.getItem(STORAGE_KEY);
  const parsed = parseTasksRecord(json);
  if (parsed.corrupt && typeof json === 'string' && json.length > 0) {
    logger.warn('storage.tasks.corrupt.detected', { action: 'quarantineAndReset' });
    await quarantine(STORAGE_KEY, CORRUPT_PREFIX, json);
  }

  if (parsed.record.migratedLegacyDayTodosAt == null) {
    const legacyJson = await storage.getItem(LEGACY_DAY_TODOS_KEY);
    const legacy = parseLegacyDayTodos(legacyJson);
    if (legacy.corrupt && typeof legacyJson === 'string' && legacyJson.length > 0) {
      logger.warn('storage.tasks.legacyDayTodos.corrupt.detected', { action: 'quarantineAndReset' });
      await quarantine(LEGACY_DAY_TODOS_KEY, LEGACY_CORRUPT_PREFIX, legacyJson);
    }
    for (const [date, items] of Object.entries(legacy.record)) {
      for (const item of items) {
        const task = dayTodoItemToTask(date, item);
        if (task) {
          task.id = `dayTodo:${date}:${item.id}`;
          task.reminders = task.reminders.map((reminder) => ({ ...reminder, id: `rem-${task.id}-${reminder.minutesFromMidnight}` }));
          if (!parsed.record.tasksById[task.id]) parsed.record.tasksById[task.id] = task;
        }
      }
    }
    parsed.record.migratedLegacyDayTodosAt = Date.now();
    await ensureLocalPersistenceReady();
    assertLocalPersistenceWritable();
    await storage.setItem(STORAGE_KEY, JSON.stringify(cloneRecord(parsed.record)));
  }

  return parsed.record;
}

async function withWriteLock<T>(op: () => Promise<T>): Promise<T> {
  const prev = writeTail;
  let release!: () => void;
  writeTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    return await op();
  } finally {
    release();
  }
}

/** Clears RAM caches after a destructive disk wipe (dev tooling). */
export function resetTasksStorageCaches(): void {
  cache = null;
  loadPromise = null;
  cacheGeneration += 1;
  cachedDayIndexRecord = null;
  cachedTaskIdsByDate = null;
  dayShardCache = new Map<string, DayTodoItem[]>();
  dayIndexCache = null;
}

/**
 * Dev-only: remove tasks DB, legacy day todos, day shards, and corrupt backups; persist an empty migrated record.
 */
export async function wipeTasksStorageCompletely(): Promise<void> {
  return withWriteLock(async () => {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter(
      (k) =>
        k === STORAGE_KEY ||
        k === LEGACY_DAY_TODOS_KEY ||
        k === DAY_INDEX_KEY ||
        k.startsWith(DAY_SHARD_PREFIX) ||
        k.startsWith(CORRUPT_PREFIX) ||
        k.startsWith(LEGACY_CORRUPT_PREFIX)
    );
    if (toRemove.length > 0) {
      await storage.multiRemove(toRemove);
    }
    resetTasksStorageCaches();
    const fresh: TasksRecord = {
      version: 1,
      tasksById: {},
      listsById: {},
      tagsById: {},
      historyByTaskId: {},
      migratedLegacyDayTodosAt: Date.now(),
    };
    await persistRecord(cloneRecord(fresh));
  });
}

/**
 * Dev-only: write normalized day shards + index (caller must have wiped tasks first if replacing everything).
 */
export async function bulkWriteDayTodoShardsForDev(shards: Record<string, readonly DayTodoItem[]>): Promise<void> {
  return withWriteLock(async () => {
    const dates = Object.keys(shards).filter(isValidISODateKey).sort();
    for (const date of dates) {
      const items = shards[date];
      await persistDayShardData(date, items ? [...items] : []);
    }
    if (dates.length > 0) await persistDayIndex(dates);
  });
}

async function getAllTasksRecord(): Promise<TasksRecord> {
  try {
    if (cache) return cache;
    await ensureLocalPersistenceReady();
    if (loadPromise) return loadPromise;
    const generationAtStart = cacheGeneration;
    loadPromise = readFromDisk().then((next) => {
      if (cacheGeneration === generationAtStart) cache = next;
      return next;
    });
    const result = await loadPromise;
    loadPromise = null;
    return result;
  } catch (error) {
    loadPromise = null;
    logger.warn('storage.tasks.load.failed', { error });
    return cloneRecord(EMPTY_RECORD);
  }
}

async function persistRecord(record: TasksRecord): Promise<void> {
  await ensureLocalPersistenceReady();
  assertLocalPersistenceWritable();
  const safeNext = cloneRecord(record);
  await storage.setItem(STORAGE_KEY, JSON.stringify(safeNext));
  cacheGeneration += 1;
  loadPromise = null;
  cachedDayIndexRecord = null;
  cachedTaskIdsByDate = null;
  cache = safeNext;
}

function taskIdsByDate(record: TasksRecord): Map<string, string[]> {
  if (cachedDayIndexRecord === record && cachedTaskIdsByDate) return cachedTaskIdsByDate;
  const index = new Map<string, string[]>();
  for (const task of Object.values(record.tasksById)) {
    if (!task.dueDate || task.status === 'archived') continue;
    const ids = index.get(task.dueDate) ?? [];
    ids.push(task.id);
    index.set(task.dueDate, ids);
  }
  if (record === cache) {
    cachedDayIndexRecord = record;
    cachedTaskIdsByDate = index;
  }
  return index;
}

function dayItemsFromRecord(record: TasksRecord, date: string): DayTodoItem[] {
  const ids = taskIdsByDate(record).get(date) ?? [];
  return ids
    .map((id) => record.tasksById[id])
    .filter((task): task is Task => !!task)
    .map(taskToDayTodoItem)
    .filter((item): item is DayTodoItem => !!item)
    .sort((a, b) => a.sortIndex - b.sortIndex || a.createdAt - b.createdAt);
}

async function getDayShardItems(date: string): Promise<DayTodoItem[]> {
  const cached = dayShardCache.get(date);
  if (cached) return cached.map(cloneDayItem);
  const parsed = parseDayShard(await storage.getItem(`${DAY_SHARD_PREFIX}${date}`));
  if (parsed) {
    dayShardCache.set(date, parsed);
    return parsed.map(cloneDayItem);
  }
  const fallback = dayItemsFromRecord(await getAllTasksRecord(), date);
  if (fallback.length > 0) await persistDayShard(date, fallback);
  return fallback.map(cloneDayItem);
}

function dayTaskFromShard(date: string, item: DayTodoItem): Task | null {
  const task = dayTodoItemToTask(date, item);
  if (!task) return null;
  task.id = item.id;
  return task;
}

export async function getTasks(): Promise<Task[]> {
  const record = await getAllTasksRecord();
  const tasksById: Record<string, Task> = {};
  for (const task of Object.values(record.tasksById)) tasksById[task.id] = cloneTask(task);
  for (const date of await getDayIndex()) {
    const items = await getDayShardItems(date);
    for (const item of items) {
      const task = dayTaskFromShard(date, item);
      if (task) tasksById[task.id] = task;
    }
  }
  return Object.values(tasksById);
}

export type RecurrenceGenerationResult = {
  processedTemplates: number;
  generatedOccurrences: number;
};

export async function generateDueTaskRecurrences(
  throughDate: string,
  maxTemplates = 4
): Promise<RecurrenceGenerationResult> {
  if (!isValidISODateKey(throughDate)) return { processedTemplates: 0, generatedOccurrences: 0 };
  return withWriteLock(async () => {
    const record = cloneRecord(await getAllTasksRecord());
    let processedTemplates = 0;
    let generatedOccurrences = 0;
    const templates = Object.values(record.tasksById).filter((task) => task.recurrence && task.status !== 'archived');
    for (const task of templates) {
      if (!task.recurrence || processedTemplates >= maxTemplates) break;
      const cursor = task.recurrence.lastGeneratedDate ?? task.dueDate ?? task.recurrence.startDate;
      const nextDate = nextRecurrenceDate(task.recurrence, cursor);
      if (!nextDate || nextDate > throughDate) continue;
      processedTemplates += 1;
      const occurrenceId = `recurrence:${task.recurrence.id}:${nextDate}`;
      if (!record.tasksById[occurrenceId]) {
        const occurrence = createDayTask({
          date: nextDate,
          title: task.title,
          sortIndex: 0,
          id: occurrenceId,
          now: Date.now(),
        });
        occurrence.source = 'task';
        record.tasksById[occurrence.id] = occurrence;
        const dayItems = await getDayShardItems(nextDate);
        const item = taskToDayTodoItem(occurrence);
        if (item && !dayItems.some((existing) => existing.id === item.id)) {
          await persistDayShard(nextDate, [...dayItems, item]);
        }
        generatedOccurrences += 1;
      }
      const history = record.historyByTaskId[task.id] ?? [];
      const historyId = `hist:${task.recurrence.id}:${nextDate}`;
      if (!history.some((event) => event.id === historyId)) {
        const event: TaskHistory = { id: historyId, taskId: task.id, type: 'recurrenceGenerated', at: Date.now(), note: nextDate };
        record.historyByTaskId[task.id] = [
          ...history,
          event,
        ].slice(-5000);
      }
      task.recurrence.lastGeneratedDate = nextDate;
      record.tasksById[task.id] = task;
    }
    if (processedTemplates > 0) await persistRecord(record);
    return { processedTemplates, generatedOccurrences };
  });
}

export async function getTasksForDate(date: string): Promise<DayTodoItem[]> {
  if (!isValidISODateKey(date)) return [];
  return getDayShardItems(date);
}

export async function addTaskForDate(date: string, titleRaw: string): Promise<DayTodoItem[]> {
  if (!isValidISODateKey(date)) throw new Error(`[tasksStorage] Invalid date key: ${String(date)}`);
  const title = titleRaw.trim();
  if (!title) return getTasksForDate(date);
  return withWriteLock(async () => {
    const current = await getDayShardItems(date);
    if (current.length >= DAY_TODO_MAX_ITEMS_PER_DAY) return current.map((item) => ({ ...item }));
    const maxSort = current.reduce((max, item) => Math.max(max, item.sortIndex), -1);
    const task = createDayTask({ date, title, sortIndex: maxSort + 1 });
    const item = taskToDayTodoItem(task);
    const next = item ? [...current, item] : current;
    await persistDayShard(date, next);
    return next.map(cloneDayItem);
  });
}

export async function setTaskDoneForDate(date: string, id: string, done: boolean): Promise<DayTodoItem[]> {
  if (!isValidISODateKey(date)) throw new Error(`[tasksStorage] Invalid date key: ${String(date)}`);
  return withWriteLock(async () => {
    const current = await getDayShardItems(date);
    let changed = false;
    const now = Date.now();
    const next = current.map((item) => {
      if (item.id !== id) return item;
      changed = true;
      return { ...item, done, createdAt: item.createdAt || now };
    });
    if (changed) await persistDayShard(date, next);
    return (changed ? next : current).map(cloneDayItem);
  });
}

export async function setTaskReminderForDate(date: string, id: string, minutes: number | null): Promise<DayTodoItem[]> {
  if (!isValidISODateKey(date)) throw new Error(`[tasksStorage] Invalid date key: ${String(date)}`);
  return withWriteLock(async () => {
    const current = await getDayShardItems(date);
    let changed = false;
    const reminder = taskReminderForDay(date, minutes)[0]?.minutesFromMidnight ?? null;
    const next = current.map((item) => {
      if (item.id !== id) return item;
      changed = true;
      return { ...item, reminderMinutes: reminder };
    });
    if (changed) await persistDayShard(date, next);
    return (changed ? next : current).map(cloneDayItem);
  });
}

export async function deleteTaskForDate(date: string, id: string): Promise<DayTodoItem[]> {
  if (!isValidISODateKey(date)) throw new Error(`[tasksStorage] Invalid date key: ${String(date)}`);
  return withWriteLock(async () => {
    const current = await getDayShardItems(date);
    const next = current.filter((item) => item.id !== id);
    if (next.length !== current.length) await persistDayShard(date, next);
    return next.map(cloneDayItem);
  });
}

export async function clearCompletedTasksForDate(date: string): Promise<DayTodoItem[]> {
  if (!isValidISODateKey(date)) throw new Error(`[tasksStorage] Invalid date key: ${String(date)}`);
  return withWriteLock(async () => {
    const current = await getDayShardItems(date);
    const next = current.filter((item) => !item.done);
    if (next.length !== current.length) await persistDayShard(date, next);
    return next.map(cloneDayItem);
  });
}

export async function reorderOpenTasksForDate(date: string, openIdsInOrder: string[]): Promise<DayTodoItem[]> {
  if (!isValidISODateKey(date)) throw new Error(`[tasksStorage] Invalid date key: ${String(date)}`);
  return withWriteLock(async () => {
    const current = await getDayShardItems(date);
    const open = current.filter((item) => !item.done);
    if (open.length !== openIdsInOrder.length) {
      logger.warn('storage.tasks.reorder.lengthMismatch', { date });
      return current;
    }
    const openSet = new Set(open.map((item) => item.id));
    const seen = new Set<string>();
    for (const id of openIdsInOrder) {
      if (!openSet.has(id) || seen.has(id)) {
        logger.warn('storage.tasks.reorder.invalidIds', { date });
        return current;
      }
      seen.add(id);
    }
    openIdsInOrder.forEach((id, idx) => {
      const item = current.find((x) => x.id === id);
      if (item) item.sortIndex = idx;
    });
    await persistDayShard(date, current);
    return sortDayItems(current).map(cloneDayItem);
  });
}

export function resetTasksStorageSessionStateForTests(): void {
  if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') return;
  invalidateTasksSessionCache();
}

export function invalidateTasksSessionCache(): void {
  cache = null;
  loadPromise = null;
  cacheGeneration = 0;
  writeTail = Promise.resolve();
  cachedDayIndexRecord = null;
  cachedTaskIdsByDate = null;
  dayShardCache = new Map<string, DayTodoItem[]>();
  dayIndexCache = null;
}

/** Cloud sync: read tasks metadata record snapshot. */
export async function getTasksRecordSnapshot(): Promise<TasksRecord> {
  return cloneRecord(await getAllTasksRecord());
}

/** Cloud sync: replace tasks metadata (during pull). */
export async function replaceTasksRecordForSync(record: TasksRecord): Promise<void> {
  return withWriteLock(async () => {
    await persistRecord(cloneRecord(record));
  });
}

/** Cloud sync: replace one day shard (during pull). */
export async function replaceTaskDayShardForSync(date: string, items: readonly DayTodoItem[]): Promise<void> {
  if (!isValidISODateKey(date)) return;
  return withWriteLock(async () => {
    await persistDayShardData(date, [...items]);
  });
}
