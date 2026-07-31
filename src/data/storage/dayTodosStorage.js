/**
 * @fileoverview Per-day to-do lists (AsyncStorage).
 * @module data/storage/dayTodosStorage
 *
 * Key: `kairo.dayTodos`
 * Value: `{ [date: YYYY-MM-DD]: DayTodoItem[] }`
 */
import { DAY_TODO_MAX_ITEMS_PER_DAY } from '../../types';
import { logger } from '../../lib/security/logger';
import { isValidISODateKey, normalizeNote } from '../model/entry';
import { assertLocalPersistenceWritable, ensureLocalPersistenceReady } from '../persistence/bootstrap';
import { storage } from './asyncStorage';
import { addTaskForDate, clearCompletedTasksForDate, deleteTaskForDate, getTasksForDate, reorderOpenTasksForDate, resetTasksStorageSessionStateForTests, setTaskDoneForDate, setTaskReminderForDate, } from './tasksStorage';
const STORAGE_KEY = 'kairo.dayTodos';
const CORRUPT_PREFIX = `${STORAGE_KEY}.corrupt.`;
const MAX_ITEMS_PER_DAY = DAY_TODO_MAX_ITEMS_PER_DAY;
let cache = null;
let loadPromise = null;
let cacheGeneration = 0;
let writeTail = Promise.resolve();
function cloneTodoItem(item) {
    return { ...item };
}
function sortDayList(list) {
    return [...list].sort((a, b) => a.sortIndex - b.sortIndex || a.createdAt - b.createdAt);
}
function cloneDayList(list) {
    return sortDayList(list).map(cloneTodoItem);
}
function cloneRecord(record) {
    const out = {};
    for (const [date, list] of Object.entries(record)) {
        if (list.length > 0)
            out[date] = cloneDayList(list);
    }
    return out;
}
async function withWriteLock(op) {
    const prev = writeTail;
    let release;
    writeTail = new Promise((r) => {
        release = r;
    });
    await prev;
    try {
        return await op();
    }
    finally {
        release();
    }
}
function newTodoId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function normalizeTitle(raw) {
    return normalizeNote(raw);
}
function normalizeItem(raw, fallbackSort) {
    if (!raw || typeof raw !== 'object')
        return null;
    const o = raw;
    const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : null;
    if (!id)
        return null;
    const title = typeof o.title === 'string' ? normalizeTitle(o.title) : '';
    const done = o.done === true;
    const createdAt = typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) ? o.createdAt : Date.now();
    const sortIndex = typeof o.sortIndex === 'number' && Number.isFinite(o.sortIndex) ? Math.floor(o.sortIndex) : fallbackSort;
    let reminderMinutes = null;
    if (o.reminderMinutes != null && typeof o.reminderMinutes === 'number' && Number.isFinite(o.reminderMinutes)) {
        const rm = Math.round(o.reminderMinutes);
        if (rm >= 0 && rm < 24 * 60)
            reminderMinutes = rm;
    }
    return { id, title, done, createdAt, sortIndex, reminderMinutes };
}
function normalizeDayList(v) {
    if (!Array.isArray(v))
        return [];
    const out = [];
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
function safeParse(json) {
    if (!json)
        return { record: {}, corrupt: false };
    try {
        const raw = JSON.parse(json);
        if (!raw || typeof raw !== 'object' || Array.isArray(raw))
            return { record: {}, corrupt: true };
        const out = {};
        for (const [k, v] of Object.entries(raw)) {
            if (!isValidISODateKey(k))
                continue;
            const list = normalizeDayList(v);
            if (list.length > 0)
                out[k] = list;
        }
        return { record: out, corrupt: false };
    }
    catch {
        return { record: {}, corrupt: true };
    }
}
async function quarantineCorruptValue(rawJson) {
    const ts = Date.now();
    try {
        await storage.setItem(`${CORRUPT_PREFIX}${ts}`, rawJson);
    }
    catch (e) {
        logger.warn('storage.dayTodos.corruptBackup.persistFailed', { error: e });
    }
    try {
        await storage.setItem(STORAGE_KEY, JSON.stringify({}));
    }
    catch (e) {
        logger.error('storage.dayTodos.corruptReset.failed', { error: e });
    }
}
async function readFromDisk() {
    await ensureLocalPersistenceReady();
    const json = await storage.getItem(STORAGE_KEY);
    const parsed = safeParse(json);
    if (parsed.corrupt && typeof json === 'string' && json.length > 0) {
        logger.warn('storage.dayTodos.corrupt.detected', { action: 'quarantineAndReset' });
        await quarantineCorruptValue(json);
    }
    return parsed.record;
}
async function getAllDayTodos() {
    try {
        if (cache)
            return cache;
        await ensureLocalPersistenceReady();
        if (loadPromise)
            return loadPromise;
        const generationAtStart = cacheGeneration;
        loadPromise = readFromDisk().then((next) => {
            if (cacheGeneration === generationAtStart)
                cache = next;
            return next;
        });
        const res = await loadPromise;
        loadPromise = null;
        return res;
    }
    catch (e) {
        loadPromise = null;
        logger.warn('storage.dayTodos.load.failed', { error: e });
        return {};
    }
}
async function getMutableRecordForWrite() {
    if (cache)
        return cloneRecord(cache);
    if (loadPromise)
        return cloneRecord(await loadPromise);
    return cloneRecord(await readFromDisk());
}
async function persistRecord(next) {
    await ensureLocalPersistenceReady();
    assertLocalPersistenceWritable();
    const safeNext = cloneRecord(next);
    await storage.setItem(STORAGE_KEY, JSON.stringify(safeNext));
    cacheGeneration += 1;
    loadPromise = null;
    cache = safeNext;
}
export async function getDayTodosForDate(date) {
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
export async function addDayTodo(date, titleRaw) {
    return addTaskForDate(date, titleRaw);
    if (!isValidISODateKey(date)) {
        throw new Error(`[dayTodosStorage] Invalid date key: ${String(date)}`);
    }
    const title = normalizeTitle(titleRaw);
    if (!title)
        return getDayTodosForDate(date);
    return withWriteLock(async () => {
        const all = await getMutableRecordForWrite();
        const current = [...(all[date] ?? [])];
        if (current.length >= MAX_ITEMS_PER_DAY)
            return cloneDayList(current);
        const maxSort = current.reduce((m, t) => Math.max(m, t.sortIndex), -1);
        const item = {
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
        }
        catch (e) {
            logger.error('storage.dayTodos.add.failed', { date, error: e });
            throw e;
        }
        return cloneDayList(next);
    });
}
export async function setDayTodoReminder(date, id, reminderMinutes) {
    return setTaskReminderForDate(date, id, reminderMinutes);
    if (!isValidISODateKey(date)) {
        throw new Error(`[dayTodosStorage] Invalid date key: ${String(date)}`);
    }
    const nextMinutes = typeof reminderMinutes === 'number' &&
        reminderMinutes >= 0 &&
        reminderMinutes < 24 * 60
        ? Math.round(reminderMinutes)
        : null;
    return withWriteLock(async () => {
        const all = await getMutableRecordForWrite();
        const current = [...(all[date] ?? [])];
        const idx = current.findIndex((t) => t.id === id);
        if (idx === -1)
            return cloneDayList(current);
        const row = current[idx];
        const next = current.slice();
        next[idx] = { ...row, reminderMinutes: nextMinutes };
        all[date] = next;
        try {
            await persistRecord(all);
        }
        catch (e) {
            logger.error('storage.dayTodos.reminder.failed', { date, id, error: e });
            throw e;
        }
        return cloneDayList(next);
    });
}
export async function setDayTodoDone(date, id, done) {
    return setTaskDoneForDate(date, id, done);
    if (!isValidISODateKey(date)) {
        throw new Error(`[dayTodosStorage] Invalid date key: ${String(date)}`);
    }
    return withWriteLock(async () => {
        const all = await getMutableRecordForWrite();
        const current = [...(all[date] ?? [])];
        const idx = current.findIndex((t) => t.id === id);
        if (idx === -1)
            return cloneDayList(current);
        const next = current.slice();
        next[idx] = { ...next[idx], done };
        all[date] = next;
        try {
            await persistRecord(all);
        }
        catch (e) {
            logger.error('storage.dayTodos.done.failed', { date, id, error: e });
            throw e;
        }
        return cloneDayList(next);
    });
}
export async function deleteDayTodo(date, id) {
    return deleteTaskForDate(date, id);
    if (!isValidISODateKey(date)) {
        throw new Error(`[dayTodosStorage] Invalid date key: ${String(date)}`);
    }
    return withWriteLock(async () => {
        const all = await getMutableRecordForWrite();
        const current = [...(all[date] ?? [])];
        const next = current.filter((t) => t.id !== id);
        if (next.length === 0)
            delete all[date];
        else
            all[date] = next;
        try {
            await persistRecord(all);
        }
        catch (e) {
            logger.error('storage.dayTodos.delete.failed', { date, id, error: e });
            throw e;
        }
        return cloneDayList(next);
    });
}
/** Remove every completed task for one day (empty-done days drop the map key). */
export async function clearCompletedDayTodos(date) {
    return clearCompletedTasksForDate(date);
    if (!isValidISODateKey(date)) {
        throw new Error(`[dayTodosStorage] Invalid date key: ${String(date)}`);
    }
    return withWriteLock(async () => {
        const all = await getMutableRecordForWrite();
        const current = [...(all[date] ?? [])];
        const next = current.filter((t) => !t.done);
        if (next.length === 0)
            delete all[date];
        else
            all[date] = next;
        try {
            await persistRecord(all);
        }
        catch (e) {
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
export async function reorderOpenDayTodos(date, openIdsInOrder) {
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
        const seen = new Set();
        for (const id of openIdsInOrder) {
            if (!openSet.has(id) || seen.has(id)) {
                logger.warn('storage.dayTodos.reorder.invalidIds', { date });
                return cloneDayList(current);
            }
            seen.add(id);
        }
        const byId = new Map(openTasks.map((t) => [t.id, t]));
        const reorderedOpen = openIdsInOrder.map((id) => byId.get(id));
        const merged = [...reorderedOpen, ...doneTasks];
        const reindexed = merged.map((t, i) => ({ ...t, sortIndex: i }));
        if (reindexed.length === 0)
            delete all[date];
        else
            all[date] = reindexed;
        try {
            await persistRecord(all);
        }
        catch (e) {
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
export function resetDayTodosStorageSessionStateForTests() {
    resetTasksStorageSessionStateForTests();
    if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test')
        return;
    cache = null;
    loadPromise = null;
    cacheGeneration = 0;
    writeTail = Promise.resolve();
}
