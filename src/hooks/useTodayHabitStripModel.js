/**
 * @fileoverview Loads habit strip state for a given calendar date (Today, journal, calendar modals).
 * @module hooks/useTodayHabitStripModel
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, InteractionManager } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { toggleHabitForDate, getHabitSelectionsForDate, getTrackedHabitIds, getHabitSelectionsCacheGeneration, getHabitTrackingCacheGeneration, peekHabitSelectionsForDateFromSessionCache, peekTrackedHabitIdsFromSessionCache, } from '../storage';
import { catalogHabitsForTodayStrip, shouldRenderTodayHabitStrip } from '../utils';
import { useAppTheme } from '../theme';
import { haptics } from '../system/haptics';
import { logger } from '../security';
function habitIdSetsEqual(a, b) {
    if (a.size !== b.size)
        return false;
    for (const id of a)
        if (!b.has(id))
            return false;
    return true;
}
export function useTodayHabitStripModel(date) {
    const { habitsEnabled } = useAppTheme();
    const isFocused = useIsFocused();
    const [selected, setSelected] = useState(() => {
        const peeked = peekHabitSelectionsForDateFromSessionCache(date);
        return peeked ? new Set(peeked) : new Set();
    });
    const [tracked, setTracked] = useState(() => {
        const peeked = peekTrackedHabitIdsFromSessionCache();
        return peeked ? new Set(peeked) : new Set();
    });
    const [trackedReady, setTrackedReady] = useState(() => peekTrackedHabitIdsFromSessionCache() !== undefined);
    const selectedRef = useRef(selected);
    const mountedRef = useRef(true);
    const dateRef = useRef(date);
    const trackedReqIdRef = useRef(0);
    const selectionsReqIdRef = useRef(0);
    const lastTrackedGenerationRef = useRef(-1);
    const lastSelectionsGenerationRef = useRef(-1);
    const trackedLoadCountRef = useRef(0);
    const selectionsLoadCountRef = useRef(0);
    const writingRef = useRef(false);
    const reloadAfterWriteRef = useRef(false);
    useEffect(() => {
        selectedRef.current = selected;
    }, [selected]);
    useEffect(() => {
        dateRef.current = date;
        const peeked = peekHabitSelectionsForDateFromSessionCache(date);
        if (peeked !== undefined) {
            const nextSelected = new Set(peeked);
            setSelected((prev) => (habitIdSetsEqual(prev, nextSelected) ? prev : nextSelected));
            selectedRef.current = nextSelected;
        }
    }, [date]);
    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);
    const loadTracked = useCallback(async () => {
        const generation = getHabitTrackingCacheGeneration();
        if (lastTrackedGenerationRef.current === generation && trackedLoadCountRef.current > 0) {
            if (mountedRef.current)
                setTrackedReady(true);
            return;
        }
        const reqId = ++trackedReqIdRef.current;
        trackedLoadCountRef.current += 1;
        try {
            const ids = await getTrackedHabitIds();
            if (!mountedRef.current || reqId !== trackedReqIdRef.current)
                return;
            const next = new Set(ids);
            setTracked((prev) => (habitIdSetsEqual(prev, next) ? prev : next));
            lastTrackedGenerationRef.current = getHabitTrackingCacheGeneration();
        }
        catch (e) {
            logger.warn('today.habits.tracked.load.failed', { error: e });
        }
        finally {
            if (mountedRef.current && reqId === trackedReqIdRef.current)
                setTrackedReady(true);
        }
    }, []);
    const reloadSelections = useCallback(async () => {
        const generation = getHabitSelectionsCacheGeneration();
        if (lastSelectionsGenerationRef.current === generation && selectionsLoadCountRef.current > 0) {
            return;
        }
        const reqId = ++selectionsReqIdRef.current;
        const loadDate = date;
        selectionsLoadCountRef.current += 1;
        try {
            const ids = await getHabitSelectionsForDate(loadDate);
            if (writingRef.current) {
                reloadAfterWriteRef.current = true;
                return;
            }
            if (!mountedRef.current || reqId !== selectionsReqIdRef.current || dateRef.current !== loadDate)
                return;
            const ns = new Set(ids);
            setSelected((prev) => (habitIdSetsEqual(prev, ns) ? prev : ns));
            selectedRef.current = ns;
            lastSelectionsGenerationRef.current = getHabitSelectionsCacheGeneration();
        }
        catch (e) {
            logger.warn('today.habits.load.failed', { date, error: e });
        }
    }, [date]);
    useEffect(() => {
        if (!isFocused)
            return;
        if (!habitsEnabled) {
            setTracked(new Set());
            setTrackedReady(true);
            return;
        }
        const peekedTracked = peekTrackedHabitIdsFromSessionCache();
        if (peekedTracked !== undefined) {
            const nextTracked = new Set(peekedTracked);
            setTracked((prev) => (habitIdSetsEqual(prev, nextTracked) ? prev : nextTracked));
            setTrackedReady(true);
        }
        const peekedSelections = peekHabitSelectionsForDateFromSessionCache(date);
        if (peekedSelections !== undefined) {
            const nextSelected = new Set(peekedSelections);
            setSelected((prev) => (habitIdSetsEqual(prev, nextSelected) ? prev : nextSelected));
            selectedRef.current = nextSelected;
        }
        const runLoads = () => {
            void loadTracked();
            void reloadSelections();
        };
        const trackedGen = getHabitTrackingCacheGeneration();
        const selectionsGen = getHabitSelectionsCacheGeneration();
        const warmReturn = lastTrackedGenerationRef.current === trackedGen &&
            lastSelectionsGenerationRef.current === selectionsGen &&
            trackedLoadCountRef.current > 0 &&
            selectionsLoadCountRef.current > 0;
        if (warmReturn || peekedTracked !== undefined || peekedSelections !== undefined) {
            queueMicrotask(runLoads);
            return;
        }
        const task = InteractionManager.runAfterInteractions(runLoads);
        return () => task.cancel();
    }, [isFocused, date, habitsEnabled, loadTracked, reloadSelections]);
    const onToggle = useCallback(async (id) => {
        if (writingRef.current)
            return;
        const writeDate = date;
        const previous = new Set(selectedRef.current);
        haptics.toggle();
        writingRef.current = true;
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            selectedRef.current = next;
            return next;
        });
        try {
            const { habitIdsForDate } = await toggleHabitForDate(writeDate, id);
            if (!mountedRef.current || dateRef.current !== writeDate)
                return;
            const next = new Set(habitIdsForDate);
            setSelected(next);
            selectedRef.current = next;
        }
        catch (e) {
            if (!mountedRef.current || dateRef.current !== writeDate)
                return;
            logger.warn('today.habits.toggle.failed', { id, error: e });
            setSelected(previous);
            selectedRef.current = previous;
            Alert.alert('Error', 'Could not update habit. Please try again.');
        }
        finally {
            writingRef.current = false;
            if (reloadAfterWriteRef.current) {
                reloadAfterWriteRef.current = false;
                void reloadSelections();
            }
        }
    }, [date, reloadSelections]);
    const { showStrip, habitsVisible } = useMemo(() => {
        if (!trackedReady || !shouldRenderTodayHabitStrip(habitsEnabled, tracked)) {
            return { showStrip: false, habitsVisible: [] };
        }
        const visible = catalogHabitsForTodayStrip(tracked);
        return { showStrip: visible.length > 0, habitsVisible: visible };
    }, [trackedReady, habitsEnabled, tracked]);
    return { trackedReady, showStrip, habitsVisible, selected, onToggle };
}
