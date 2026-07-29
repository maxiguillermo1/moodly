/**
 * @fileoverview Focus-deferred journal list reload (sorted snapshot, latest-request-wins).
 * @module hooks/useJournalEntriesLoad
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { MoodEntry } from '../types';
import {
  getJournalEntriesSortedDescSnapshot,
  getEntriesSessionEpoch,
  peekJournalEntriesSortedDescFromSessionCache,
} from '../storage';
import { entriesSameForJournal, isLatestRequest, nextRequestId } from '../utils';
import { logger } from '../security';
import { perfProbe } from '../perf';

export type JournalEntriesLoadResult = {
  entriesDesc: MoodEntry[];
  journalLoadCompleted: boolean;
  mountedRef: React.MutableRefObject<boolean>;
  /** True while the Journal tab is focused (for post-async alert gating). */
  focusedRef: React.MutableRefObject<boolean>;
  reload: () => Promise<void>;
};

function hydrateFromSessionPeek(
  setEntriesDesc: React.Dispatch<React.SetStateAction<MoodEntry[]>>,
  setJournalLoadCompleted: React.Dispatch<React.SetStateAction<boolean>>
): boolean {
  const peeked = peekJournalEntriesSortedDescFromSessionCache();
  if (peeked === undefined) return false;
  setEntriesDesc((prev) => (entriesSameForJournal(prev, peeked) ? prev : peeked));
  setJournalLoadCompleted(true);
  return true;
}

export function useJournalEntriesLoad(screen = 'JournalScreen'): JournalEntriesLoadResult {
  const [entriesDesc, setEntriesDesc] = useState<MoodEntry[]>(() => {
    return peekJournalEntriesSortedDescFromSessionCache() ?? [];
  });
  const [journalLoadCompleted, setJournalLoadCompleted] = useState(
    () => peekJournalEntriesSortedDescFromSessionCache() !== undefined
  );
  const mountedRef = useRef(true);
  const focusedRef = useRef(false);
  const reloadReqIdRef = useRef(0);
  const loadCountRef = useRef(0);
  const didFlushPerfReportRef = useRef(false);
  const lastEntriesEpochRef = useRef(-1);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    const epoch = getEntriesSessionEpoch();
    if (lastEntriesEpochRef.current === epoch && loadCountRef.current > 0) {
      return;
    }

    const reqId = nextRequestId(reloadReqIdRef);
    const phase = loadCountRef.current === 0 ? 'cold' : 'warm';
    loadCountRef.current += 1;
    const start = perfProbe.nowMs();
    try {
      const sorted = await getJournalEntriesSortedDescSnapshot();
      if (!mountedRef.current || !isLatestRequest(reloadReqIdRef, reqId)) return;
      setEntriesDesc((prev) => (entriesSameForJournal(prev, sorted) ? prev : sorted));
      logger.perf('journal.loadEntries', {
        phase,
        source: 'sessionCache',
        durationMs: Number((perfProbe.nowMs() - start).toFixed(1)),
      });
    } finally {
      if (mountedRef.current && isLatestRequest(reloadReqIdRef, reqId)) {
        setJournalLoadCompleted(true);
        lastEntriesEpochRef.current = epoch;
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      if (perfProbe.enabled) didFlushPerfReportRef.current = false;

      const sessionPrimed = hydrateFromSessionPeek(setEntriesDesc, setJournalLoadCompleted);

      const runReload = () => {
        void reload();
      };

      const epoch = getEntriesSessionEpoch();
      const warmReturn = lastEntriesEpochRef.current === epoch && loadCountRef.current > 0;
      if (warmReturn || sessionPrimed) {
        queueMicrotask(runReload);
        return () => {
          focusedRef.current = false;
          nextRequestId(reloadReqIdRef);
          if (perfProbe.enabled && !didFlushPerfReportRef.current) {
            didFlushPerfReportRef.current = true;
            queueMicrotask(() => perfProbe.flushReport(`${screen}.blur`));
          }
        };
      }

      const task = InteractionManager.runAfterInteractions(runReload);
      return () => {
        task.cancel();
        focusedRef.current = false;
        nextRequestId(reloadReqIdRef);
        if (perfProbe.enabled && !didFlushPerfReportRef.current) {
          didFlushPerfReportRef.current = true;
          queueMicrotask(() => perfProbe.flushReport(`${screen}.blur`));
        }
      };
    }, [reload, screen])
  );

  return { entriesDesc, journalLoadCompleted, mountedRef, focusedRef, reload };
}
