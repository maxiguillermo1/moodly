/**
 * @fileoverview Loads habit strip state for a given calendar date (Today, journal, calendar modals).
 * @module hooks/useTodayHabitStripModel
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import type { HabitDefinition, HabitId } from '../types';
import { toggleHabitForDate, getHabitSelectionsForDate, getTrackedHabitIds } from '../storage';
import { catalogHabitsForTodayStrip, shouldRenderTodayHabitStrip } from '../utils';
import { useAppTheme } from '../theme';
import { haptics } from '../system/haptics';
import { logger } from '../security';

export type TodayHabitStripModel = {
  /** Ready when tracked habit ids have loaded at least once. */
  trackedReady: boolean;
  /** True when settings + tracked habits allow showing chips and the filtered catalog is non-empty. */
  showStrip: boolean;
  habitsVisible: readonly HabitDefinition[];
  selected: ReadonlySet<HabitId>;
  onToggle: (id: HabitId) => Promise<void>;
};

export function useTodayHabitStripModel(date: string): TodayHabitStripModel {
  const { habitsEnabled } = useAppTheme();
  const isFocused = useIsFocused();
  const [selected, setSelected] = useState<ReadonlySet<HabitId>>(() => new Set());
  const [tracked, setTracked] = useState<ReadonlySet<HabitId>>(() => new Set());
  const [trackedReady, setTrackedReady] = useState(false);

  const selectedRef = useRef<ReadonlySet<HabitId>>(selected);
  const mountedRef = useRef(true);
  const dateRef = useRef(date);
  const trackedReqIdRef = useRef(0);
  const selectionsReqIdRef = useRef(0);
  const writingRef = useRef(false);
  const reloadAfterWriteRef = useRef(false);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    dateRef.current = date;
  }, [date]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadTracked = useCallback(async () => {
    const reqId = ++trackedReqIdRef.current;
    try {
      const ids = await getTrackedHabitIds();
      if (!mountedRef.current || reqId !== trackedReqIdRef.current) return;
      setTracked(new Set(ids));
    } catch (e) {
      logger.warn('today.habits.tracked.load.failed', { error: e });
    } finally {
      if (mountedRef.current && reqId === trackedReqIdRef.current) setTrackedReady(true);
    }
  }, []);

  const reloadSelections = useCallback(async () => {
    const reqId = ++selectionsReqIdRef.current;
    const loadDate = date;
    try {
      const ids = await getHabitSelectionsForDate(loadDate);
      if (writingRef.current) {
        reloadAfterWriteRef.current = true;
        return;
      }
      if (!mountedRef.current || reqId !== selectionsReqIdRef.current || dateRef.current !== loadDate) return;
      const ns = new Set(ids);
      setSelected(ns);
      selectedRef.current = ns;
    } catch (e) {
      logger.warn('today.habits.load.failed', { date, error: e });
    }
  }, [date]);

  useEffect(() => {
    if (!isFocused) return;
    if (!habitsEnabled) {
      setTracked(new Set());
      setTrackedReady(true);
      return;
    }
    void loadTracked();
    void reloadSelections();
  }, [isFocused, date, habitsEnabled, loadTracked, reloadSelections]);

  const onToggle = useCallback(
    async (id: HabitId) => {
      if (writingRef.current) return;
      const writeDate = date;
      const previous = new Set(selectedRef.current);
      haptics.toggle();
      writingRef.current = true;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        selectedRef.current = next;
        return next;
      });
      try {
        const { habitIdsForDate } = await toggleHabitForDate(writeDate, id);
        if (!mountedRef.current || dateRef.current !== writeDate) return;
        const next = new Set(habitIdsForDate);
        setSelected(next);
        selectedRef.current = next;
      } catch (e) {
        if (!mountedRef.current || dateRef.current !== writeDate) return;
        logger.warn('today.habits.toggle.failed', { id, error: e });
        setSelected(previous);
        selectedRef.current = previous;
        Alert.alert('Error', 'Could not update habit. Please try again.');
      } finally {
        writingRef.current = false;
        if (reloadAfterWriteRef.current) {
          reloadAfterWriteRef.current = false;
          void reloadSelections();
        }
      }
    },
    [date, reloadSelections]
  );

  const { showStrip, habitsVisible } = useMemo(() => {
    if (!trackedReady || !shouldRenderTodayHabitStrip(habitsEnabled, tracked)) {
      return { showStrip: false, habitsVisible: [] as HabitDefinition[] };
    }
    const visible = catalogHabitsForTodayStrip(tracked);
    return { showStrip: visible.length > 0, habitsVisible: visible };
  }, [trackedReady, habitsEnabled, tracked]);

  return { trackedReady, showStrip, habitsVisible, selected, onToggle };
}
