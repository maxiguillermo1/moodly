/**
 * @fileoverview Load and mutate per-day todos for the Today extension.
 * @module hooks/useDayTodos
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { createSerialEnqueue } from '../utils';
import { addDayTodo, clearCompletedDayTodos, deleteDayTodo, getDayTodosForDate, getTasksCacheGeneration, peekDayTodosFromSessionCache, reorderOpenDayTodos, setDayTodoDone, setDayTodoReminder, } from '../storage';
function dayTodosSame(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i += 1) {
        const x = a[i];
        const y = b[i];
        if (x.id !== y.id ||
            x.title !== y.title ||
            x.done !== y.done ||
            x.sortIndex !== y.sortIndex ||
            x.reminderMinutes !== y.reminderMinutes) {
            return false;
        }
    }
    return true;
}
export function useDayTodos(date) {
    const [items, setItems] = useState(() => peekDayTodosFromSessionCache(date) ?? []);
    const [busy, setBusy] = useState(false);
    /** False until the first load for the current `date` finishes (focused). */
    const [loaded, setLoaded] = useState(() => peekDayTodosFromSessionCache(date) !== undefined);
    const isFocused = useIsFocused();
    const mountedRef = useRef(true);
    const requestIdRef = useRef(0);
    const dateRef = useRef(date);
    const lastGenerationRef = useRef(-1);
    const loadCountRef = useRef(0);
    dateRef.current = date;
    const enqueueRef = useRef(createSerialEnqueue());
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);
    useEffect(() => {
        requestIdRef.current += 1;
        const peeked = peekDayTodosFromSessionCache(date);
        if (peeked !== undefined) {
            setItems(peeked);
            setLoaded(true);
        }
        else {
            setLoaded(false);
        }
    }, [date]);
    const reload = useCallback(() => {
        const generation = getTasksCacheGeneration();
        if (lastGenerationRef.current === generation && loadCountRef.current > 0) {
            return Promise.resolve();
        }
        const reqId = ++requestIdRef.current;
        loadCountRef.current += 1;
        return enqueueRef.current(async () => {
            const day = dateRef.current;
            try {
                const next = await getDayTodosForDate(day);
                if (!mountedRef.current || reqId !== requestIdRef.current)
                    return;
                setItems((prev) => (dayTodosSame(prev, next) ? prev : next));
            }
            catch {
                if (!mountedRef.current || reqId !== requestIdRef.current)
                    return;
                setItems([]);
            }
            finally {
                if (mountedRef.current && reqId === requestIdRef.current) {
                    setLoaded(true);
                    lastGenerationRef.current = getTasksCacheGeneration();
                }
            }
        });
    }, []);
    useEffect(() => {
        if (!isFocused)
            return;
        const peeked = peekDayTodosFromSessionCache(date);
        if (peeked !== undefined) {
            setItems((prev) => (dayTodosSame(prev, peeked) ? prev : peeked));
            setLoaded(true);
        }
        const runReload = () => {
            void reload();
        };
        const generation = getTasksCacheGeneration();
        const warmReturn = lastGenerationRef.current === generation && loadCountRef.current > 0;
        if (warmReturn || peeked !== undefined) {
            queueMicrotask(runReload);
            return;
        }
        const task = InteractionManager.runAfterInteractions(runReload);
        return () => task.cancel();
    }, [isFocused, date, reload]);
    const add = useCallback(async (title) => {
        const day = dateRef.current;
        const reqId = ++requestIdRef.current;
        setBusy(true);
        try {
            await enqueueRef.current(async () => {
                const next = await addDayTodo(day, title);
                if (mountedRef.current && reqId === requestIdRef.current)
                    setItems(next);
            });
        }
        finally {
            setBusy(false);
        }
    }, []);
    const toggleDone = useCallback(async (id, done) => {
        const day = dateRef.current;
        const reqId = ++requestIdRef.current;
        await enqueueRef.current(async () => {
            try {
                const next = await setDayTodoDone(day, id, done);
                if (mountedRef.current && reqId === requestIdRef.current)
                    setItems(next);
            }
            catch {
                await reload();
            }
        });
    }, [reload]);
    const setReminder = useCallback(async (id, reminderMinutes) => {
        const day = dateRef.current;
        const reqId = ++requestIdRef.current;
        await enqueueRef.current(async () => {
            try {
                const next = await setDayTodoReminder(day, id, reminderMinutes);
                if (mountedRef.current && reqId === requestIdRef.current)
                    setItems(next);
            }
            catch {
                await reload();
            }
        });
    }, [reload]);
    const remove = useCallback(async (id) => {
        const day = dateRef.current;
        const reqId = ++requestIdRef.current;
        await enqueueRef.current(async () => {
            try {
                const next = await deleteDayTodo(day, id);
                if (mountedRef.current && reqId === requestIdRef.current)
                    setItems(next);
            }
            catch {
                await reload();
            }
        });
    }, [reload]);
    const clearCompleted = useCallback(async () => {
        const day = dateRef.current;
        const reqId = ++requestIdRef.current;
        await enqueueRef.current(async () => {
            try {
                const next = await clearCompletedDayTodos(day);
                if (mountedRef.current && reqId === requestIdRef.current)
                    setItems(next);
            }
            catch {
                await reload();
            }
        });
    }, [reload]);
    const reorderOpen = useCallback(async (openIdsInOrder) => {
        const day = dateRef.current;
        const reqId = ++requestIdRef.current;
        await enqueueRef.current(async () => {
            try {
                const next = await reorderOpenDayTodos(day, openIdsInOrder);
                if (mountedRef.current && reqId === requestIdRef.current)
                    setItems(next);
            }
            catch {
                await reload();
            }
        });
    }, [reload]);
    return { items, busy, loaded, reload, add, toggleDone, setReminder, remove, clearCompleted, reorderOpen };
}
