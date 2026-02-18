/**
 * @fileoverview Accessibility helpers (VoiceOver, Reduce Motion).
 *
 * Goals:
 * - Centralize Reduce Motion state (single listener; no per-component listeners).
 * - Provide fast, deterministic label helpers for calendar day cells.
 */

import { AccessibilityInfo } from 'react-native';

let reduceMotionEnabled = false;
let installed = false;

export function installAccessibilityObservers(): void {
  if (installed) return;
  installed = true;

  AccessibilityInfo.isReduceMotionEnabled()
    .then((v) => {
      reduceMotionEnabled = !!v;
    })
    .catch(() => {});

  (AccessibilityInfo as any).addEventListener?.('reduceMotionChanged', (v: boolean) => {
    reduceMotionEnabled = !!v;
  });
}

export function getReduceMotionEnabled(): boolean {
  return reduceMotionEnabled;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function ordinal(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n}st`;
  if (mod10 === 2 && mod100 !== 12) return `${n}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${n}rd`;
  return `${n}th`;
}

export function weekdayName(idx0: number): string {
  return WEEKDAYS[idx0 as 0 | 1 | 2 | 3 | 4 | 5 | 6] ?? 'Day';
}

export function formatDayCellA11yLabel(opts: {
  weekdayIndex0: number; // 0..6
  monthName: string;
  day: number;
  year: number;
  mood?: string | null;
  hasNote?: boolean;
}): string {
  const wd = weekdayName(opts.weekdayIndex0);
  let s = `${wd}, ${opts.monthName} ${ordinal(opts.day)}, ${opts.year}.`;
  if (opts.mood) s += ` Mood ${opts.mood}.`;
  else s += ' No entry.';
  if (opts.hasNote) s += ' Has note.';
  return s;
}

