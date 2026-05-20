/**
 * @fileoverview Per-day to-do lists (AsyncStorage).
 * @module data/storage/dayTodosStorage
 *
 * Key: `kairo.dayTodos`
 * Value: `{ [date: YYYY-MM-DD]: DayTodoItem[] }`
 */

import type { DayTodoItem } from '../../types';
import { DAY_TODO_MAX_ITEMS_PER_DAY } from '../../types';
import { logger } from '../../lib/security/logger';
import { isValidISODateKey, normalizeNote } from '../model/entry';
import { assertLocalPersistenceWritable, ensureLocalPersistenceReady } from '../persistence/bootstrap';
import { storage } from './asyncStorage';
import {
  addTaskForDate,
  clearCompletedTasksForDate,
  deleteTaskForDate,
  getTasksForDate,
  reorderOpenTasksForDate,
  resetTasksStorageSessionStateForTests,
  setTaskDoneForDate,
  setTaskReminderForDate,
} from './tasksStorage';

const STORAGE_KEY = 'kairo.dayTodos';
const CORRUPT_PREFIX = `${STORAGE_KEY}.corrupt.`;
const MAX_ITEMS_PER_DAY = DAY_TODO_MAX_ITEMS_PER_DAY;

export type DayTodosRecord = Record<string, DayTodoItem[]>;

let cache: DayTodosRecord | null = null;
let loadPromise: Promise<DayTodosRecord> | null = null;
let cacheGeneration = 0;
let writeTail: Promise<void> = Promise.resolve();

function cloneTodoItem(item: DayTodoItem): DayTodoItem {
  return { ...item };
}

function sortDayList(list: readonly DayTodoItem[]): DayTodoItem[] {
  return [...list].sort((a, b) => a.sortIndex - b.sortIndex || a.createdAt - b.createdAt);
}

function cloneDayList(list: readonly DayTodoItem[]): DayTodoItem[] {
  return sortDayList(list).map(cloneTodoItem);
}

function cloneRecord(record: DayTodosRecord): DayTodosRecord {
  const out: DayTodosRecord = {};
  for (const [date, list] of Object.entries(record)) {
    if (list.length > 0) out[date] = cloneDayList(list);
  }
  return out;
}

async function withWriteLock<T>(op: () => Promise<T>): Promise<T> {
  const prev = writeTail;
  let release!: () => void;
  writeTail = new Promise<void>((r) => {
    release = r;
  });
  await prev;
  try {
    return await op();
  } finally {
    release();
  }
}

function newTodoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTitle(raw: string): string {
  return normalizeNote(raw);
}

function normalizeItem(raw: unknown, fallbackSort: number): DayTodoItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : null;
  if (!id) return null;
  const title = typeof o.title === 'string' ? normalizeTitle(o.title) : '';
  const done = o.done === true;
  const createdAt = typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) ? o.createdAt : Date.now();
  const sortIndex =
    typeof o.sortIndex === 'number' && Number.isFinite(o.sortIndex) ? Math.floor(o.sortIndex) : fallbackSort;
  let reminderMinutes: number | null = null;
  if (o.reminderMinutes != null && typeof o.reminderMinutes === 'number' && Number.isFinite(o.reminderMinutes)) {
    const rm = Math.round(o.reminderMinutes);
    if (rm >= 0 && rm < 24 * 60) reminderMinutes = rm;
  }
  return { id, title, done, createdAt, sortIndex, reminderMinutes };
}

function normalizeDayList(v: unknown): DayTodoItem[] {
  if (!Array.isArray(v)) return [];
  const out: DayTodoItem[] = [];
  let i = 0;
  for (const x of v) {
    const item = normalizeItem(x, i);
    if (item && item.title.length > 0) {
      out.push(item);
      i += 1;
    }
  }
  out.sort((a, b) => a.sortIndex - b.sortIndex || a.createdAt - b.createdAt);
  return out.slice(0, MAX_ITEMS_PER_DAY);
}

type ParseResult = { record: DayTodosRecord; corrupt: boolean };

function safeParse(json: string | null): ParseResult {
  if (!json) return { record: {}, corrupt: false };
  try {
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { record: {}, corrupt: true };
    const out: DayTodosRecord = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!isValidISODateKey(k)) continue;
      const list = normalizeDayList(v);
      if (list.length > 0) out[k] = list;
    }
    return { record: out, corrupt: false };
  } catch {
    return { record: {}, corrupt: true };
  }
}

async function quarantineCorruptValue(rawJson: string): Promise<void> {
  const ts = Date.now();
  try {
    await storage.setItem(`${CORRUPT_PREFIX}${ts}`, rawJson);
  } catch (e) {
    logger.warn('storage.dayTodos.corruptBackup.persistFailed', { error: e });
  }
  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify({}));
  } catch (e) {
    logger.error('storage.dayTodos.corruptReset.failed', { error: e });
  }
}

async function readFromDisk(): Promise<DayTodosRecord> {
  await ensureLocalPersistenceReady();
  const json = await storage.getItem(STORAGE_KEY);
  const parsed = safeParse(json);
  if (parsed.corrupt && typeof json === 'string' && json.length > 0) {
    logger.warn('storage.dayTodos.corrupt.detected', { action: 'quarantineAndReset' });
    await quarantineCorruptValue(json);
  }
  return parsed.record;
}

async function getAllDayTodos(): Promise<DayTodosRecord> {
  try {
    if (cache) return cache;
    await ensureLocalPersistenceReady();
    if (loadPromise) return loadPromise;
    const generationAtStart = cacheGeneration;
    loadPromise = readFromDisk().then((next) => {
      if (cacheGeneration === generationAtStart) cache = next;
      return next;
    });
    const res = await loadPromise;
    loadPromise = null;
    return res;
  } catch (e) {
    loadPromise = null;
    logger.warn('storage.dayTodos.load.failed', { error: e });
    return {};
  }
}

async function getMutableRecordForWrite(): Promise<DayTodosRecord> {
  if (cache) return cloneRecord(cache);
  if (loadPromise) return cloneRecord(await loadPromise);
  return cloneRecord(await readFromDisk());
}

async function persistRecord(next: DayTodosRecord): Promise<void> {
  await ensureLocalPersistenceReady();
  assertLocalPersistenceWritable();
  const safeNext = cloneRecord(next);
  await storage.setItem(STORAGE_KEY, JSON.stringify(safeNext));
  cacheGeneration += 1;
  loadPromise = null;
  cache = safeNext;
}

export async function getDayTodosForDate(date: string): Promise<DayTodoItem[]> {
  return getTasksForDate(date);
  if (!isValidISODateKey(date)) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      throw new Error(`[dayTodosStorage] Invalid date key: ${String(date)}`);
    }
    return [];
  }
  const all = await getAllDayTodos();
  return cloneDayList(all[date] ?? []);
}

export async function addDayTodo(date: string, titleRaw: string): Promise<DayTodoItem[]> {
  return addTaskForDate(date, titleRaw);
  if (!isValidISODateKey(date)) {
    throw new Error(`[dayTodosStorage] Invalid date key: ${String(date)}`);
  }
  const title = normalizeTitle(titleRaw);
  if (!title) return getDayTodosForDate(date);

  return withWriteLock(async () => {
    const all = await getMutableRecordForWrite();
    const current = [...(all[date] ?? [])];
    if (current.length >= MAX_ITEMS_PER_DAY) return cloneDayList(current);
    const maxSort = current.reduce((m, t) => Math.max(m, t.sortIndex), -1);
    const item: DayTodoItem = {
      id: newTodoId(),
      title,
      done: false,
      createdAt: Date.now(),
      sortIndex: maxSort + 1,
      reminderMinutes: null,
    };
    const next = [...current, item];
    all[date] = next;
    try {
      await persistRecord(all);
    } catch (e) {
      logger.error('storage.dayTodos.add.failed', { date, error: e });
      throw e;
    }
    return cloneDayList(next);
  });
}

export async function setDayTodoReminder(date: string, id: string, reminderMinutes: number | null): Promise<DayTodoItem[]> {
  return setTaskReminderForDate(date, id, reminderMinutes);
  if (!isValidISODateKey(date)) {
    throw new Error(`[dayTodosStorage] Invalid date key: ${String(date)}`);
  }
  const nextMinutes =
    typeof (reminderMinutes as unknown) === 'number' &&
    (reminderMinutes as number) >= 0 &&
    (reminderMinutes as number) < 24 * 60
      ? Math.round(reminderMinutes as number)
      : null;

  return withWriteLock(async () => {
    const all = await getMutableRecordForWrite();
    const current = [...(all[date] ?? [])];
    const idx = current.findIndex((t) => t.id === id);
    if (idx === -1) return cloneDayList(current);
    const row = current[idx]!;
    const next = current.slice();
    next[idx] = { ...row, reminderMinutes: nextMinutes };
    all[date] = next;
    try {
      await persistRecord(all);
    } catch (e) {
      logger.error('storage.dayTodos.reminder.failed', { date, id, error: e });
      throw e;
    }
    return cloneDayList(next);
  });
}

export async function setDayTodoDone(date: string, id: string, done: boolean): Promise<DayTodoItem[]> {
  return setTaskDoneForDate(date, id, done);
  if (!isValidISODateKey(date)) {
    throw new Error(`[dayTodosStorage] Invalid date key: ${String(date)}`);
  }

  return withWriteLock(async () => {
    const all = await getMutableRecordForWrite();
    const current = [...(all[date] ?? [])];
    const idx = current.findIndex((t) => t.id === id);
    if (idx === -1) return cloneDayList(current);
    const next = current.slice();
    next[idx] = { ...next[idx], done };
    all[date] = next;
    try {
      await persistRecord(all);
    } catch (e) {
      logger.error('storage.dayTodos.done.failed', { date, id, error: e });
      throw e;
    }
    return cloneDayList(next);
  });
}

export async function deleteDayTodo(date: string, id: string): Promise<DayTodoItem[]> {
  return deleteTaskForDate(date, id);
  if (!isValidISODateKey(date)) {
    throw new Error(`[dayTodosStorage] Invalid date key: ${String(date)}`);
  }

  return withWriteLock(async () => {
    const all = await getMutableRecordForWrite();
    const current = [...(all[date] ?? [])];
    const next = current.filter((t) => t.id !== id);
    if (next.length === 0) delete all[date];
    else all[date] = next;
    try {
      await persistRecord(all);
    } catch (e) {
      logger.error('storage.dayTodos.delete.failed', { date, id, error: e });
      throw e;
    }
    return cloneDayList(next);
  });
}

/** Remove every completed task for one day (empty-done days drop the map key). */
export async function clearCompletedDayTodos(date: string): Promise<DayTodoItem[]> {
  return clearCompletedTasksForDate(date);
  if (!isValidISODateKey(date)) {
    throw new Error(`[dayTodosStorage] Invalid date key: ${String(date)}`);
  }

  return withWriteLock(async () => {
    const all = await getMutableRecordForWrite();
    const current = [...(all[date] ?? [])];
    const next = current.filter((t) => !t.done);
    if (next.length === 0) delete all[date];
    else all[date] = next;
    try {
      await persistRecord(all);
    } catch (e) {
      logger.error('storage.dayTodos.clearCompleted.failed', { date, error: e });
      throw e;
    }
    return cloneDayList(next);
  });
}

/**
 * Reorder **open** (incomplete) tasks for a day. Completed tasks stay grouped at the end, in stable order.
 * If `openIdsInOrder` doesn’t match current open tasks (race), returns the current sorted list without writing.
 */
export async function reorderOpenDayTodos(date: string, openIdsInOrder: string[]): Promise<DayTodoItem[]> {
  return reorderOpenTasksForDate(date, openIdsInOrder);
  if (!isValidISODateKey(date)) {
    throw new Error(`[dayTodosStorage] Invalid date key: ${String(date)}`);
  }

  return withWriteLock(async () => {
    const all = await getMutableRecordForWrite();
    const current = [...(all[date] ?? [])];
    const openTasks = current.filter((t) => !t.done);
    const doneTasks = current
      .filter((t) => t.done)
      .sort((a, b) => a.sortIndex - b.sortIndex || a.createdAt - b.createdAt);

    if (openIdsInOrder.length !== openTasks.length) {
      logger.warn('storage.dayTodos.reorder.lengthMismatch', { date });
      return cloneDayList(current);
    }

    const openSet = new Set(openTasks.map((t) => t.id));
    const seen = new Set<string>();
    for (const id of openIdsInOrder) {
      if (!openSet.has(id) || seen.has(id)) {
        logger.warn('storage.dayTodos.reorder.invalidIds', { date });
        return cloneDayList(current);
      }
      seen.add(id);
    }

    const byId = new Map(openTasks.map((t) => [t.id, t] as const));
    const reorderedOpen = openIdsInOrder.map((id) => byId.get(id)!);
    const merged = [...reorderedOpen, ...doneTasks];
    const reindexed = merged.map((t, i) => ({ ...t, sortIndex: i }));

    if (reindexed.length === 0) delete all[date];
    else all[date] = reindexed;

    try {
      await persistRecord(all);
    } catch (e) {
      logger.error('storage.dayTodos.reorder.failed', { date, error: e });
      throw e;
    }
    return cloneDayList(reindexed);
  });
}

/**
 * @internal Jest-only: simulate a cold read path without `jest.resetModules()`.
 *
 * Remounting modules clears the in-memory AsyncStorage mock and drops persisted fixtures;
 * use this helper when tests need “session lost, disk intact” semantics.
 */
export function resetDayTodosStorageSessionStateForTests(): void {
  resetTasksStorageSessionStateForTests();
  if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') return;
  cache = null;
  loadPromise = null;
  cacheGeneration = 0;
  writeTail = Promise.resolve();
}
