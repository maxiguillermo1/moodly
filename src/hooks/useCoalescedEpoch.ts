/**
 * @fileoverview Coalesces multiple list “epoch” bumps into one state update per macrotask.
 * Used so FlashList rows recycle once when focus, data load, and midnight boundaries align.
 * @module hooks/useCoalescedEpoch
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useCoalescedEpoch(): readonly [epoch: number, scheduleBump: () => void] {
  const [epoch, setEpoch] = useState(0);
  const pendingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      pendingRef.current = false;
    };
  }, []);

  const scheduleBump = useCallback(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    queueMicrotask(() => {
      if (!mountedRef.current) return;
      pendingRef.current = false;
      setEpoch((e) => e + 1);
    });
  }, []);

  return [epoch, scheduleBump] as const;
}
