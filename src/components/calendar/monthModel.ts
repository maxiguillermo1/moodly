/**
 * @fileoverview MonthModel cache for Calendar hot paths.
 *
 * Purpose:
 * - Centralize cached month computations keyed by YYYY-MM
 * - Provide stable, reusable arrays for:
 *   - ISO date keys by day (1..31)
 *   - per-day press handlers (stable)
 *   - per-day derived metadata used by MonthGrid rendering (moodColor, hasNote)
 *
 * ABSOLUTE RULES:
 * - No UI/UX behavior changes.
 * - Dev-only logging must remain metadata-only (this module logs only slow-build guards).
 */

import type { MoodEntry, MoodGrade } from '../../types';
import { getMoodColor } from '../../utils';
import { logger } from '../../security';

export type CalendarMoodStyle = 'dot' | 'fill';

// Precomputed day strings "01".."31" to avoid padStart in hot loops.
const DAY_2: string[] = (() => {
  const out = new Array<string>(32);
  out[0] = '';
  for (let d = 1; d <= 31; d++) out[d] = String(d).padStart(2, '0');
  return out;
})();

export type PressByDay = Array<(() => void) | undefined>;

export type MonthRenderModel = {
  monthKey: string; // YYYY-MM
  isoByDay: string[]; // index 1..31 used; 0 unused
  moodColorByDay: Array<string | null>; // 1..31
  hasNoteByDay: boolean[]; // 1..31
  // `pressByDay` is optional (mini grids do not handle presses).
  pressByDay: PressByDay | null;
  // Selected day (1..31) if selectedDate is in this month; otherwise 0.
  selectedDay: number;
  // Today day (1..31) if todayIso is in this month; otherwise 0.
  todayDay: number;
  // Whether we should render full-day fill style (theme + moodColor).
  isFillTheme: boolean;
  // Stable size/style key for DayCell internal style lookup.
  sizeKey: 'full' | 'mini-dot' | 'mini-fill';
  monthName: string;
  year: number;
  monthIndex0: number;
};

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// `trim()` allocates; for "has note" semantics we only need to know
// whether there is at least one non-whitespace character.
const HAS_NON_WHITESPACE_RE = /\S/;
function hasNonWhitespace(note: string | undefined | null): boolean {
  return typeof note === 'string' && note.length > 0 && HAS_NON_WHITESPACE_RE.test(note);
}

// Shared immutable arrays for empty months (safe: MonthGrid treats these as read-only).
const ALL_NULL_32: ReadonlyArray<string | null> = Object.freeze(new Array(32).fill(null));
const ALL_FALSE_32: ReadonlyArray<boolean> = Object.freeze(new Array(32).fill(false));

function monthKeyOf(year: number, monthIndex0: number): string {
  const mm2 = String(monthIndex0 + 1).padStart(2, '0');
  return `${year}-${mm2}`;
}

// Cache ISO keys by monthKey. Safe: purely deterministic and does not depend on user data.
const isoByMonthKeyCache = new Map<string, string[]>();

export function getIsoByDay(year: number, monthIndex0: number): string[] {
  const mk = monthKeyOf(year, monthIndex0);
  const cached = isoByMonthKeyCache.get(mk);
  if (cached) return cached;

  const prefix = `${mk}-`;
  const out = new Array<string>(32);
  out[0] = '';
  for (let d = 1; d <= 31; d++) out[d] = `${prefix}${DAY_2[d]}`;
  isoByMonthKeyCache.set(mk, out);
  return out;
}

// Cache per-day press handler arrays keyed by (monthKey, onPressDate, onHapticSelect).
// Uses WeakMaps so handlers can be GC'd (no memory leaks from long-lived caches).
type PressCacheEntry = {
  // onPressDate + no haptic
  noHaptic: Map<string, PressByDay>;
  // onPressDate + onHapticSelect
  byHaptic: WeakMap<Function, Map<string, PressByDay>>;
};
const pressCache = new WeakMap<Function, PressCacheEntry>();

export function getPressByDay(
  monthKey: string,
  isoByDay: string[],
  onPressDate: ((isoDate: string) => void) | undefined,
  onHapticSelect: (() => void) | undefined
): PressByDay | null {
  if (!onPressDate) return null;

  let entry = pressCache.get(onPressDate);
  if (!entry) {
    entry = { noHaptic: new Map<string, PressByDay>(), byHaptic: new WeakMap<Function, Map<string, PressByDay>>() };
    pressCache.set(onPressDate, entry);
  }

  if (!onHapticSelect) {
    const cached = entry.noHaptic.get(monthKey);
    if (cached) return cached;
    const out = new Array<(() => void) | undefined>(32);
    out[0] = undefined;
    for (let d = 1; d <= 31; d++) {
      const key = isoByDay[d]!;
      out[d] = () => {
        onPressDate(key);
      };
    }
    entry.noHaptic.set(monthKey, out);
    return out;
  }

  let byMonth = entry.byHaptic.get(onHapticSelect);
  if (!byMonth) {
    byMonth = new Map<string, PressByDay>();
    entry.byHaptic.set(onHapticSelect, byMonth);
  }

  const cached = byMonth.get(monthKey);
  if (cached) return cached;

  const out = new Array<(() => void) | undefined>(32);
  out[0] = undefined;
  for (let d = 1; d <= 31; d++) {
    const key = isoByDay[d]!;
    out[d] = () => {
      onHapticSelect();
      onPressDate(key);
    };
  }
  byMonth.set(monthKey, out);
  return out;
}

// Month render model cache keyed by monthKey; invalidated by entriesRevision and selected/today.
// This keeps recomputation month-scoped, not global.
type MonthModelCacheEntry = {
  entriesRevision: number;
  selectedDay: number;
  todayDay: number;
  isFillTheme: boolean;
  // We also key by the monthEntries map identity to avoid false hits if revision is reused.
  entriesRef: Record<string, MoodEntry>;
  onPressDateRef?: (isoDate: string) => void;
  onHapticSelectRef?: () => void;
  variant: 'mini' | 'full';
  model: MonthRenderModel;
};

const monthModelCache = new Map<string, MonthModelCacheEntry>();

// -----------------------------------------------------------------------------
// Dev perf guard (sampled + once) to detect regressions on large datasets.
// -----------------------------------------------------------------------------
const DEV_SLOW_BUILD_THRESHOLD_MS = 12;
let devBuildSample = 0;
let didLogSlowBuild = false;
function nowMs(): number {
  const p: any = (globalThis as any).performance;
  return typeof p?.now === 'function' ? p.now() : Date.now();
}
function shouldSampleSlowBuild(): boolean {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return false;
  if (didLogSlowBuild) return false;
  // Sample ~1/128 calls until we see a slow build, then log once.
  return ((devBuildSample++ & 0x7f) === 0);
}

function dayFromIsoIfInMonth(monthKey: string, iso: string | undefined): number {
  if (!iso || iso.length < 10) return 0;
  if (!iso.startsWith(monthKey)) return 0;
  // YYYY-MM-DD
  const d = Number(iso.slice(8, 10));
  return Number.isFinite(d) && d >= 1 && d <= 31 ? d : 0;
}

export function getMonthRenderModel(opts: {
  year: number;
  monthIndex0: number;
  variant: 'mini' | 'full';
  calendarMoodStyle: CalendarMoodStyle;
  monthEntries: Record<string, MoodEntry>;
  entriesRevision: number;
  selectedDate?: string;
  todayIso: string;
  onPressDate?: (isoDate: string) => void;
  onHapticSelect?: () => void;
}): MonthRenderModel {
  const { year, monthIndex0, variant, calendarMoodStyle, monthEntries, entriesRevision, selectedDate, todayIso, onPressDate, onHapticSelect } =
    opts;

  const t0 = shouldSampleSlowBuild() ? nowMs() : 0;
  const mk = monthKeyOf(year, monthIndex0);
  const isFillTheme = calendarMoodStyle === 'fill';
  const selectedDay = dayFromIsoIfInMonth(mk, selectedDate);
  const todayDay = dayFromIsoIfInMonth(mk, todayIso);

  const cacheKey = `${mk}|${variant}|${calendarMoodStyle}`;
  const cached = monthModelCache.get(cacheKey);
  if (
    cached &&
    cached.entriesRevision === entriesRevision &&
    cached.selectedDay === selectedDay &&
    cached.todayDay === todayDay &&
    cached.isFillTheme === isFillTheme &&
    cached.entriesRef === monthEntries &&
    cached.onPressDateRef === onPressDate &&
    cached.onHapticSelectRef === onHapticSelect
  ) {
    return cached.model;
  }

  const isoByDay = getIsoByDay(year, monthIndex0);
  const pressByDay = getPressByDay(mk, isoByDay, onPressDate, onHapticSelect);

  // Fast path: most months are empty. Avoid per-day allocations/loops when monthEntries has no keys.
  let hasAnyEntry = false;
  // `for..in` is allocation-free and faster than Object.keys for this check.
  for (const k in monthEntries) {
    void k;
    hasAnyEntry = true;
    break;
  }

  // Derive per-day values once per month render.
  const moodColorByDay: Array<string | null> = hasAnyEntry ? new Array<string | null>(32) : (ALL_NULL_32 as any);
  const hasNoteByDay: boolean[] = hasAnyEntry ? new Array<boolean>(32) : (ALL_FALSE_32 as any);
  if (hasAnyEntry) {
    moodColorByDay[0] = null;
    hasNoteByDay[0] = false;
    for (let d = 1; d <= 31; d++) {
      const e = monthEntries[isoByDay[d]!] as MoodEntry | undefined;
      const mood = (e?.mood ?? null) as MoodGrade | null;
      moodColorByDay[d] = mood ? getMoodColor(mood) : null;
      hasNoteByDay[d] = e ? hasNonWhitespace(e.note) : false;
    }
  }

  const sizeKey: MonthRenderModel['sizeKey'] =
    variant === 'full' ? 'full' : isFillTheme ? 'mini-fill' : 'mini-dot';

  const model: MonthRenderModel = {
    monthKey: mk,
    isoByDay,
    moodColorByDay,
    hasNoteByDay,
    pressByDay,
    selectedDay,
    todayDay,
    isFillTheme,
    sizeKey,
    monthName: MONTHS_LONG[monthIndex0] ?? '',
    year,
    monthIndex0,
  };

  monthModelCache.set(cacheKey, {
    entriesRevision,
    selectedDay,
    todayDay,
    isFillTheme,
    entriesRef: monthEntries,
    onPressDateRef: onPressDate,
    onHapticSelectRef: onHapticSelect,
    variant,
    model,
  });

  if (t0 > 0) {
    const dt = nowMs() - t0;
    if (dt >= DEV_SLOW_BUILD_THRESHOLD_MS) {
      didLogSlowBuild = true;
      logger.perf('calendar.monthModel.slowBuild', {
        phase: 'warm',
        source: 'ui',
        monthKey: mk,
        variant,
        calendarMoodStyle,
        hasAnyEntry,
        durationMs: Number(dt.toFixed(1)),
      });
    }
  }

  return model;
}

