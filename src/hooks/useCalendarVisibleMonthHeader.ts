/**
 * @fileoverview Visible month state + one-per-frame header coalescer + commit helper.
 * @module hooks/useCalendarVisibleMonthHeader
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createFrameCoalescer, type FrameCoalescer } from '../utils';
import { logger } from '../security';

export type YearMonth = { y: number; m: number };

export function useCalendarVisibleMonthHeader(anchorDate: Date) {
  const [visibleMonth, setVisibleMonth] = useState<YearMonth>(() => ({
    y: anchorDate.getFullYear(),
    m: anchorDate.getMonth(),
  }));

  useEffect(() => {
    setVisibleMonth({ y: anchorDate.getFullYear(), m: anchorDate.getMonth() });
  }, [anchorDate]);

  const headerMonthLiveCoalescerRef = useRef<FrameCoalescer<YearMonth> | null>(null);
  useEffect(() => {
    headerMonthLiveCoalescerRef.current = createFrameCoalescer((next) => {
      setVisibleMonth((prev) => (prev.y === next.y && prev.m === next.m ? prev : next));
    });
    return () => {
      headerMonthLiveCoalescerRef.current?.cancel();
      headerMonthLiveCoalescerRef.current = null;
    };
  }, []);

  const commitVisibleMonth = useCallback((next: YearMonth, reason: 'scrollEnd' | 'programmatic') => {
    setVisibleMonth((prev) => {
      if (prev.y === next.y && prev.m === next.m) return prev;
      logger.perf('calendar.visibleMonth.commit', {
        phase: 'warm',
        source: 'ui',
        y: next.y,
        m: next.m,
        reason,
      });
      return next;
    });
  }, []);

  return { visibleMonth, setVisibleMonth, commitVisibleMonth, headerMonthLiveCoalescerRef };
}
