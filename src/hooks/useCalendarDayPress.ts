/**
 * @fileoverview Day tap → async load entry + open editor (latest-tap-wins via req id).
 * @module hooks/useCalendarDayPress
 */

import { useCallback, type MutableRefObject } from 'react';
import { getEntry } from '../storage';
import { formatDateForDisplay, isLatestRequest, nextRequestId, isValidLocalCalendarDayKey } from '../utils';
import { logger } from '../security';
import { perfProbe } from '../perf';
import type { MoodGrade } from '../types';
import { announceForAccessibility } from '../system/accessibility';
import { haptics } from '../system/haptics';

type Args = {
  getEntryReqIdRef: MutableRefObject<number>;
  setSelectedDate: (iso: string) => void;
  setEditMood: (m: MoodGrade | null) => void;
  setEditNote: (n: string) => void;
  setIsEditOpen: (open: boolean) => void;
};

export function useCalendarDayPress({
  getEntryReqIdRef,
  setSelectedDate,
  setEditMood,
  setEditNote,
  setIsEditOpen,
}: Args) {
  return useCallback(
    async (isoDate: string) => {
      if (!isValidLocalCalendarDayKey(isoDate)) {
        logger.warn('calendar.dayTap.invalidDateKey', { dateKey: isoDate });
        return;
      }
      haptics.select();
      if (perfProbe.enabled) perfProbe.breadcrumb('calendar.dayTap');
      const tapStartMs = perfProbe.enabled ? perfProbe.nowMs() : 0;
      if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarScreen.dayTap');
      const reqId = nextRequestId(getEntryReqIdRef);
      setSelectedDate(isoDate);
      announceForAccessibility(`Selected ${formatDateForDisplay(isoDate)}`);
      try {
        const existing = await getEntry(isoDate);
        if (!isLatestRequest(getEntryReqIdRef, reqId)) return;
        setEditMood(existing?.mood ?? null);
        setEditNote(existing?.note ?? '');
      } catch {
        logger.warn('calendar.getEntry.failed', { dateKey: isoDate });
        if (!isLatestRequest(getEntryReqIdRef, reqId)) return;
        setEditMood(null);
        setEditNote('');
      }
      if (!isLatestRequest(getEntryReqIdRef, reqId)) return;
      setIsEditOpen(true);
      if (perfProbe.enabled) {
        perfProbe.measureSince('calendar.dayTapToModalOpen', tapStartMs, { phase: 'warm', source: 'ui' });
        perfProbe.setCulpritPhase(null);
      }
    },
    [getEntryReqIdRef, setEditMood, setEditNote, setIsEditOpen, setSelectedDate]
  );
}
