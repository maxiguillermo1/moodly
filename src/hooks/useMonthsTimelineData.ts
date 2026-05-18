/**
 * @fileoverview Memoized month-item array for the bounded timeline window (+ perf attribution).
 * @module hooks/useMonthsTimelineData
 */

import { useMemo } from 'react';
import { buildMonthWindow, type MonthItem } from '../utils';
import { perfProbe } from '../perf';

export function useMonthsTimelineData(
  anchorDate: Date,
  windowOffsets: { start: number; end: number }
): MonthItem[] {
  return useMemo(() => {
    const startMs = perfProbe.enabled ? perfProbe.nowMs() : 0;
    if (perfProbe.enabled) perfProbe.setCulpritPhase('CalendarScreen.buildMonthWindow');
    const data = buildMonthWindow(anchorDate, windowOffsets.start, windowOffsets.end);
    if (perfProbe.enabled) {
      perfProbe.measureSince('calendar.monthWindow.build', startMs, {
        phase: 'warm',
        source: 'ui',
        months: data.length,
      });
      perfProbe.setCulpritPhase(null);
    }
    return data;
  }, [anchorDate, windowOffsets.end, windowOffsets.start]);
}
