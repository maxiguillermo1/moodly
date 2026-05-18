/**
 * @fileoverview Load and mutate per-day todos for the Today extension.
 * @module hooks/useDayTodos
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { DayTodoItem } from '../types';
import { createSerialEnqueue } from '../utils';
import {
  addDayTodo,
  clearCompletedDayTodos,
  deleteDayTodo,
  getDayTodosForDate,
  reorderOpenDayTodos,
  setDayTodoDone,
  setDayTodoReminder,
} from '../storage';

export function useDayTodos(date: string) {
  const [items, setItems] = useState<readonly DayTodoItem[]>([]);
  const [busy, setBusy] = useState(false);
  /** False until the first load for the current `date` finishes (focused). */
  const [loaded, setLoaded] = useState(false);
  const isFocused = useIsFocused();
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const dateRef = useRef(date);
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
    setLoaded(false);
  }, [date]);

  const reload = useCallback(() => {
    const reqId = ++requestIdRef.current;
    return enqueueRef.current(async () => {
      const day = dateRef.current;
      try {
        const next = await getDayTodosForDate(day);
        if (!mountedRef.current || reqId !== requestIdRef.current) return;
        setItems(next);
      } catch {
        if (!mountedRef.current || reqId !== requestIdRef.current) return;
        setItems([]);
      } finally {
        if (mountedRef.current && reqId === requestIdRef.current) setLoaded(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    const task = InteractionManager.runAfterInteractions(() => {
      void reload();
    });
    return () => task.cancel();
  }, [isFocused, date, reload]);

  const add = useCallback(async (title: string) => {
    const day = dateRef.current;
    const reqId = ++requestIdRef.current;
    setBusy(true);
    try {
      await enqueueRef.current(async () => {
        const next = await addDayTodo(day, title);
        if (mountedRef.current && reqId === requestIdRef.current) setItems(next);
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const toggleDone = useCallback(
    async (id: string, done: boolean) => {
      const day = dateRef.current;
      const reqId = ++requestIdRef.current;
      await enqueueRef.current(async () => {
        try {
          const next = await setDayTodoDone(day, id, done);
          if (mountedRef.current && reqId === requestIdRef.current) setItems(next);
        } catch {
          await reload();
        }
      });
    },
    [reload]
  );

  const setReminder = useCallback(
    async (id: string, reminderMinutes: number | null) => {
      const day = dateRef.current;
      const reqId = ++requestIdRef.current;
      await enqueueRef.current(async () => {
        try {
          const next = await setDayTodoReminder(day, id, reminderMinutes);
          if (mountedRef.current && reqId === requestIdRef.current) setItems(next);
        } catch {
          await reload();
        }
      });
    },
    [reload]
  );

  const remove = useCallback(
    async (id: string) => {
      const day = dateRef.current;
      const reqId = ++requestIdRef.current;
      await enqueueRef.current(async () => {
        try {
          const next = await deleteDayTodo(day, id);
          if (mountedRef.current && reqId === requestIdRef.current) setItems(next);
        } catch {
          await reload();
        }
      });
    },
    [reload]
  );

  const clearCompleted = useCallback(async () => {
    const day = dateRef.current;
    const reqId = ++requestIdRef.current;
    await enqueueRef.current(async () => {
      try {
        const next = await clearCompletedDayTodos(day);
        if (mountedRef.current && reqId === requestIdRef.current) setItems(next);
      } catch {
        await reload();
      }
    });
  }, [reload]);

  const reorderOpen = useCallback(
    async (openIdsInOrder: string[]) => {
      const day = dateRef.current;
      const reqId = ++requestIdRef.current;
      await enqueueRef.current(async () => {
        try {
          const next = await reorderOpenDayTodos(day, openIdsInOrder);
          if (mountedRef.current && reqId === requestIdRef.current) setItems(next);
        } catch {
          await reload();
        }
      });
    },
    [reload]
  );

  return { items, busy, loaded, reload, add, toggleDone, setReminder, remove, clearCompleted, reorderOpen };
}
