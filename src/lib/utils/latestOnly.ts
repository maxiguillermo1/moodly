/**
 * @fileoverview "Latest only" async guard.
 *
 * Used to prevent stale async work from overwriting newer user intent:
 * - rapid day taps (getEntry races)
 * - "last action wins" semantics
 *
 * This is a tiny helper to make the intent explicit and testable.
 */
import type React from 'react';

export function nextRequestId(ref: React.MutableRefObject<number>): number {
  ref.current += 1;
  return ref.current;
}

export function isLatestRequest(ref: React.MutableRefObject<number>, id: number): boolean {
  return ref.current === id;
}

