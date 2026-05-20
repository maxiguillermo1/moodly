/**
 * @fileoverview Focus-deferred mood calendar snapshot load (month timeline + year grid).
 * @module hooks/useMoodCalendarSnapshotLoad
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { MoodEntry } from '../types';
import type { CalendarMoodStyle } from '../types/settings.types';
import { fetchMoodCalendarSnapshot } from '../storage/calendar';
import { applyMoodCalendarSnapshot, didLocalTodayChangeAcrossBlur, isLatestRequest, nextRequestId } from '../utils';
import { logger } from '../security';
import { perfProbe } from '../perf';

export type MoodCalendarFocusRefs = {
  isFocusedRef: React.MutableRefObject<boolean>;
  deferredInteractionRef: React.MutableRefObject<{ cancel: () => void } | null>;
};

export type MoodCalendarSnapshotLoadConfig = {
  screen: string;
  loadPerfEvent: string;
  loadPerfSource?: 'sessionCache' | (() => string);
  todayKey: string;
  /** Share focus/deferred-task refs with timeline scroll (CalendarScreen). */
  focusRefs?: MoodCalendarFocusRefs;
  /** FlashList / pager recycle when local today changes while focused. */
  onTodayKeyChangeWhileFocused?: () => void;
  /** When month map or style reference changes (year grid recycle). */
  onSnapshotMutated?: () => void;
  onBlurExtra?: () => void;
  perfFlushReportTag?: string;
  perfFlushViaMicrotask?: boolean;
};

export type MoodCalendarSnapshotLoadResult = {
  entriesByMonthKey: Record<string, Record<string, MoodEntry>>;
  setEntriesByMonthKey: React.Dispatch<React.SetStateAction<Record<string, Record<string, MoodEntry>>>>;
  calendarMoodStyle: CalendarMoodStyle;
  setCalendarMoodStyle: React.Dispatch<React.SetStateAction<CalendarMoodStyle>>;
  entriesRevisionRef: React.MutableRefObject<number>;
  isFocusedRef: React.MutableRefObject<boolean>;
  mountedRef: React.MutableRefObject<boolean>;
  deferredInteractionRef: React.MutableRefObject<{ cancel: () => void } | null>;
  reload: () => Promise<void>;
};

export function useMoodCalendarSnapshotLoad({
  screen,
  loadPerfEvent,
  loadPerfSource = 'sessionCache',
  todayKey,
  onTodayKeyChangeWhileFocused,
  onSnapshotMutated,
  onBlurExtra,
  perfFlushReportTag,
  perfFlushViaMicrotask = false,
  focusRefs,
}: MoodCalendarSnapshotLoadConfig): MoodCalendarSnapshotLoadResult {
  const [entriesByMonthKey, setEntriesByMonthKey] = useState<Record<string, Record<string, MoodEntry>>>({});
  const [calendarMoodStyle, setCalendarMoodStyle] = useState<CalendarMoodStyle>('dot');
  const entriesRevisionRef = useRef(0);
  const internalFocusedRef = useRef(true);
  const internalDeferredRef = useRef<{ cancel: () => void } | null>(null);
  const isFocusedRef = focusRefs?.isFocusedRef ?? internalFocusedRef;
  const deferredInteractionRef = focusRefs?.deferredInteractionRef ?? internalDeferredRef;
  const mountedRef = useRef(true);
  const loadReqIdRef = useRef(0);
  const entriesLoadCountRef = useRef(0);
  const todayKeyWhenBlurredRef = useRef<string | null>(null);
  const todayKeyRef = useRef(todayKey);
  todayKeyRef.current = todayKey;
  const prevTodayKeyForMidnightRef = useRef(todayKey);
  const didFlushPerfReportRef = useRef(false);

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
    if (perfProbe.enabled) perfProbe.setCulpritPhase(`${screen}.loadData`);
    const reqId = nextRequestId(loadReqIdRef);
    const phase = entriesLoadCountRef.current === 0 ? 'cold' : 'warm';
    entriesLoadCountRef.current += 1;
    const start = perfProbe.nowMs();
    const snapshot = await fetchMoodCalendarSnapshot();
    if (!mountedRef.current) return;
    if (!isFocusedRef.current) return;
    if (!isLatestRequest(loadReqIdRef, reqId)) return;
    applyMoodCalendarSnapshot({
      snapshot,
      setEntriesByMonthKey,
      setCalendarMoodStyle,
      entriesRevisionRef,
      onMutated: onSnapshotMutatedRef.current,
    });
    const source = typeof loadPerfSource === 'function' ? loadPerfSource() : loadPerfSource;
    logger.perf(loadPerfEvent as 'calendar.loadData', {
      phase,
      source,
      monthsIndexed: Object.keys(snapshot.byMonthKey).length,
      durationMs: Number((perfProbe.nowMs() - start).toFixed(1)),
    });
    if (perfProbe.enabled) perfProbe.setCulpritPhase(null);
  }, [isFocusedRef, loadPerfEvent, loadPerfSource, screen]);

  useFocusEffect(
    useCallback(() => {
      if (perfProbe.enabled) perfProbe.setCulpritPhase(`${screen}.focus`);
      isFocusedRef.current = true;
      if (perfProbe.enabled) perfProbe.screenSessionStart(screen);
      if (didLocalTodayChangeAcrossBlur(todayKeyWhenBlurredRef.current, todayKeyRef.current)) {
        onTodayKeyChangeWhileFocusedRef.current?.();
      }
      didFlushPerfReportRef.current = false;
      const task = InteractionManager.runAfterInteractions(() => {
        void reload();
      });
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
          } else {
            perfProbe.flushReport(tag);
          }
        }
      };
    }, [deferredInteractionRef, isFocusedRef, perfFlushReportTag, perfFlushViaMicrotask, reload, screen])
  );

  useEffect(() => {
    if (!isFocusedRef.current) return;
    if (prevTodayKeyForMidnightRef.current === todayKey) return;
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
