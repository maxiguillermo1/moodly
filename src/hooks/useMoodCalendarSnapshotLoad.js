/**
 * @fileoverview Focus-deferred mood calendar snapshot load (month timeline + year grid).
 * @module hooks/useMoodCalendarSnapshotLoad
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchMoodCalendarSnapshot, getMoodCalendarSnapshotEpoch, peekMoodCalendarSnapshotFromWarmCache } from '../storage/calendar';
import { applyMoodCalendarSnapshot, didLocalTodayChangeAcrossBlur, isLatestRequest, nextRequestId } from '../utils';
import { logger } from '../security';
import { perfProbe } from '../perf';
function hydrateFromSessionPeek(setEntriesByMonthKey, setCalendarMoodStyle, entriesRevisionRef, onMutated) {
    const peeked = peekMoodCalendarSnapshotFromWarmCache();
    if (!peeked)
        return false;
    applyMoodCalendarSnapshot({
        snapshot: peeked,
        setEntriesByMonthKey,
        setCalendarMoodStyle,
        entriesRevisionRef,
        onMutated,
    });
    return true;
}
export function useMoodCalendarSnapshotLoad({ screen, loadPerfEvent, loadPerfSource = 'sessionCache', todayKey, onTodayKeyChangeWhileFocused, onSnapshotMutated, onBlurExtra, perfFlushReportTag, perfFlushViaMicrotask = false, focusRefs, }) {
    const initialPeek = peekMoodCalendarSnapshotFromWarmCache();
    const [entriesByMonthKey, setEntriesByMonthKey] = useState(() => initialPeek?.byMonthKey ?? {});
    const [calendarMoodStyle, setCalendarMoodStyle] = useState(() => initialPeek?.calendarMoodStyle ?? 'fill');
    const entriesRevisionRef = useRef(0);
    const internalFocusedRef = useRef(true);
    const internalDeferredRef = useRef(null);
    const isFocusedRef = focusRefs?.isFocusedRef ?? internalFocusedRef;
    const deferredInteractionRef = focusRefs?.deferredInteractionRef ?? internalDeferredRef;
    const mountedRef = useRef(true);
    const loadReqIdRef = useRef(0);
    const entriesLoadCountRef = useRef(0);
    const todayKeyWhenBlurredRef = useRef(null);
    const todayKeyRef = useRef(todayKey);
    todayKeyRef.current = todayKey;
    const prevTodayKeyForMidnightRef = useRef(todayKey);
    const didFlushPerfReportRef = useRef(false);
    const lastSnapshotEpochRef = useRef(null);
    const onTodayKeyChangeWhileFocusedRef = useRef(onTodayKeyChangeWhileFocused);
    const onSnapshotMutatedRef = useRef(onSnapshotMutated);
    const onBlurExtraRef = useRef(onBlurExtra);
    onTodayKeyChangeWhileFocusedRef.current = onTodayKeyChangeWhileFocused;
    onSnapshotMutatedRef.current = onSnapshotMutated;
    onBlurExtraRef.current = onBlurExtra;
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);
    const reload = useCallback(async () => {
        const epoch = getMoodCalendarSnapshotEpoch();
        if (lastSnapshotEpochRef.current &&
            lastSnapshotEpochRef.current.entries === epoch.entries &&
            lastSnapshotEpochRef.current.settings === epoch.settings) {
            return;
        }
        if (perfProbe.enabled)
            perfProbe.setCulpritPhase(`${screen}.loadData`);
        const reqId = nextRequestId(loadReqIdRef);
        const phase = entriesLoadCountRef.current === 0 ? 'cold' : 'warm';
        entriesLoadCountRef.current += 1;
        const start = perfProbe.nowMs();
        const snapshot = await fetchMoodCalendarSnapshot();
        if (!mountedRef.current)
            return;
        if (!isFocusedRef.current)
            return;
        if (!isLatestRequest(loadReqIdRef, reqId))
            return;
        applyMoodCalendarSnapshot({
            snapshot,
            setEntriesByMonthKey,
            setCalendarMoodStyle,
            entriesRevisionRef,
            onMutated: onSnapshotMutatedRef.current,
        });
        const source = typeof loadPerfSource === 'function' ? loadPerfSource() : loadPerfSource;
        logger.perf(loadPerfEvent, {
            phase,
            source,
            monthsIndexed: Object.keys(snapshot.byMonthKey).length,
            durationMs: Number((perfProbe.nowMs() - start).toFixed(1)),
        });
        if (perfProbe.enabled)
            perfProbe.setCulpritPhase(null);
        lastSnapshotEpochRef.current = getMoodCalendarSnapshotEpoch();
    }, [isFocusedRef, loadPerfEvent, loadPerfSource, screen]);
    useFocusEffect(useCallback(() => {
        if (perfProbe.enabled)
            perfProbe.setCulpritPhase(`${screen}.focus`);
        isFocusedRef.current = true;
        if (perfProbe.enabled)
            perfProbe.screenSessionStart(screen);
        if (didLocalTodayChangeAcrossBlur(todayKeyWhenBlurredRef.current, todayKeyRef.current)) {
            onTodayKeyChangeWhileFocusedRef.current?.();
        }
        didFlushPerfReportRef.current = false;
        const sessionPrimed = hydrateFromSessionPeek(setEntriesByMonthKey, setCalendarMoodStyle, entriesRevisionRef, onSnapshotMutatedRef.current);
        const runReload = () => {
            void reload();
        };
        const epoch = getMoodCalendarSnapshotEpoch();
        const warmReturn = lastSnapshotEpochRef.current !== null &&
            lastSnapshotEpochRef.current.entries === epoch.entries &&
            lastSnapshotEpochRef.current.settings === epoch.settings &&
            entriesLoadCountRef.current > 0;
        if (warmReturn || sessionPrimed) {
            queueMicrotask(runReload);
            return () => {
                deferredInteractionRef.current = null;
                isFocusedRef.current = false;
                todayKeyWhenBlurredRef.current = todayKeyRef.current;
                nextRequestId(loadReqIdRef);
                onBlurExtraRef.current?.();
                if (perfProbe.enabled && !didFlushPerfReportRef.current) {
                    didFlushPerfReportRef.current = true;
                    const tag = perfFlushReportTag ?? `${screen}.blur`;
                    if (perfFlushViaMicrotask) {
                        queueMicrotask(() => perfProbe.flushReport(tag));
                    }
                    else {
                        perfProbe.flushReport(tag);
                    }
                }
            };
        }
        const task = InteractionManager.runAfterInteractions(runReload);
        deferredInteractionRef.current = task;
        return () => {
            task.cancel();
            deferredInteractionRef.current = null;
            isFocusedRef.current = false;
            todayKeyWhenBlurredRef.current = todayKeyRef.current;
            nextRequestId(loadReqIdRef);
            onBlurExtraRef.current?.();
            if (perfProbe.enabled && !didFlushPerfReportRef.current) {
                didFlushPerfReportRef.current = true;
                const tag = perfFlushReportTag ?? `${screen}.blur`;
                if (perfFlushViaMicrotask) {
                    queueMicrotask(() => perfProbe.flushReport(tag));
                }
                else {
                    perfProbe.flushReport(tag);
                }
            }
        };
    }, [deferredInteractionRef, isFocusedRef, perfFlushReportTag, perfFlushViaMicrotask, reload, screen]));
    useEffect(() => {
        if (!isFocusedRef.current)
            return;
        if (prevTodayKeyForMidnightRef.current === todayKey)
            return;
        prevTodayKeyForMidnightRef.current = todayKey;
        onTodayKeyChangeWhileFocusedRef.current?.();
    }, [isFocusedRef, todayKey]);
    return {
        entriesByMonthKey,
        setEntriesByMonthKey,
        calendarMoodStyle,
        setCalendarMoodStyle,
        entriesRevisionRef,
        isFocusedRef,
        mountedRef,
        deferredInteractionRef,
        reload,
    };
}
