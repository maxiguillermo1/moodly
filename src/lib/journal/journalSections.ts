/**
 * @fileoverview Pure journal grouping + solo filters (no React).
 * @module lib/journal/journalSections
 *
 * **Precondition:** `entries` from `getJournalEntriesSortedDescSnapshot` are newest-first
 * (`YYYY-MM-DD` lexicographic desc). Bucketing is O(n) without re-sorting rows.
 */

import type { MoodEntry, MoodGrade } from '../../types';
import { MOOD_GRADES, MOOD_CONFIG } from '../constants/moods';
import { monthNameLongEn } from '../calendar/monthLabels';
import { compareLocalDayKeysDesc, monthKeyFromLocalDayKey } from '../utils/dateKeys';
import { mondayFirstWeekdayIndex0FromDayKey, JOURNAL_WEEKDAY_SECTION_ORDER } from './journalEntryPresence';
import type { JournalListSection, JournalViewMode } from './journalSections.types';

export type { JournalListSection, JournalViewMode } from './journalSections.types';

export { compareLocalDayKeysDesc } from '../utils/dateKeys';

export const JOURNAL_WEEKDAY_SECTION_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const JOURNAL_WEEKDAY_SECTION_PLURAL = [
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
  'Sundays',
] as const;

export function entriesSameForJournal(prev: readonly MoodEntry[], next: readonly MoodEntry[]): boolean {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i];
    const b = next[i];
    if (!a || !b) return false;
    if (a.date !== b.date || a.updatedAt !== b.updatedAt || a.mood !== b.mood || a.note !== b.note) return false;
  }
  return true;
}

export function buildWeekdaySections(entries: readonly MoodEntry[]): JournalListSection[] {
  const buckets: MoodEntry[][] = [[], [], [], [], [], [], []];
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i]!;
    const b = mondayFirstWeekdayIndex0FromDayKey(e.date);
    if (b === null) continue;
    buckets[b]!.push(e);
  }
  const out: JournalListSection[] = [];
  for (const w of JOURNAL_WEEKDAY_SECTION_ORDER) {
    const data = buckets[w];
    if (!data || data.length === 0) continue;
    const name = JOURNAL_WEEKDAY_SECTION_NAMES[w];
    const n = data.length;
    out.push({
      key: `weekday-${w}`,
      title: name.toUpperCase(),
      subtitle: `${n} ${n === 1 ? 'entry' : 'entries'} · ${JOURNAL_WEEKDAY_SECTION_PLURAL[w]}`,
      kind: 'day',
      isFirst: out.length === 0,
      weekdayIndex0: w,
      data,
    });
  }
  return out;
}

export function buildMonthSections(entries: readonly MoodEntry[]): JournalListSection[] {
  const map = new Map<string, MoodEntry[]>();
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i]!;
    const mk = monthKeyFromLocalDayKey(e.date);
    const arr = map.get(mk);
    if (arr) arr.push(e);
    else map.set(mk, [e]);
  }
  const keys = [...map.keys()].sort(compareLocalDayKeysDesc);
  return keys.map((monthKey, i) => {
    const data = map.get(monthKey)!;
    const monthNum = parseInt(monthKey.slice(5, 7), 10);
    const yearNum = parseInt(monthKey.slice(0, 4), 10);
    const monthIx = monthNum >= 1 && monthNum <= 12 ? monthNum - 1 : 0;
    const title = `${monthNameLongEn(monthIx)} ${yearNum}`.toUpperCase();
    const n = data.length;
    return {
      key: `month-${monthKey}`,
      title,
      subtitle: `${n} ${n === 1 ? 'entry' : 'entries'}`,
      kind: 'month' as const,
      isFirst: i === 0,
      monthKey,
      data,
    };
  });
}

export function buildMoodSections(entries: readonly MoodEntry[]): JournalListSection[] {
  const map = new Map<MoodGrade, MoodEntry[]>();
  for (const g of MOOD_GRADES) map.set(g, []);
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i]!;
    const bucket = map.get(e.mood);
    if (bucket) bucket.push(e);
  }
  const out: JournalListSection[] = [];
  for (const g of MOOD_GRADES) {
    const data = map.get(g)!;
    if (data.length === 0) continue;
    const n = data.length;
    out.push({
      key: `mood-${g}`,
      title: String(g).toUpperCase(),
      subtitle: `${n} ${n === 1 ? 'entry' : 'entries'} · ${MOOD_CONFIG[g].label}`,
      kind: 'mood',
      isFirst: out.length === 0,
      moodGrade: g,
      data,
    });
  }
  return out;
}

export function applySoloMonthFilter(
  base: JournalListSection[],
  soloKey: string | null
): JournalListSection[] {
  if (soloKey === null) return base;
  const sub = base.filter((s) => s.monthKey === soloKey);
  if (sub.length === 0) return base;
  return sub.map((s, i) => ({ ...s, isFirst: i === 0 }));
}

export function applySoloWeekdayFilter(
  base: JournalListSection[],
  soloWeekday: number | null
): JournalListSection[] {
  if (soloWeekday === null) return base;
  const sub = base.filter((s) => s.weekdayIndex0 === soloWeekday);
  if (sub.length === 0) return base;
  return sub.map((s, i) => ({ ...s, isFirst: i === 0 }));
}

export function applySoloMoodFilter(
  base: JournalListSection[],
  soloGrade: MoodGrade | null
): JournalListSection[] {
  if (soloGrade === null) return base;
  const sub = base.filter((s) => s.moodGrade === soloGrade);
  if (sub.length > 0) return sub.map((s, i) => ({ ...s, isFirst: i === 0 }));
  return [
    {
      key: `mood-${soloGrade}-empty`,
      title: String(soloGrade).toUpperCase(),
      subtitle: `0 entries · ${MOOD_CONFIG[soloGrade].label}`,
      kind: 'mood',
      isFirst: true,
      moodGrade: soloGrade,
      data: [],
    },
  ];
}

export function buildJournalSectionsForViewMode(
  viewMode: JournalViewMode,
  entriesDesc: readonly MoodEntry[],
  solo: {
    byMonthSoloKey: string | null;
    byDaySoloWeekday: number | null;
    byMoodSoloGrade: MoodGrade | null;
  }
): JournalListSection[] {
  switch (viewMode) {
    case 'byMonth':
      return applySoloMonthFilter(buildMonthSections(entriesDesc), solo.byMonthSoloKey);
    case 'byDay':
      return applySoloWeekdayFilter(buildWeekdaySections(entriesDesc), solo.byDaySoloWeekday);
    case 'byMood':
      return applySoloMoodFilter(buildMoodSections(entriesDesc), solo.byMoodSoloGrade);
    default:
      return [];
  }
}

export function a11yAnnouncementForViewMode(mode: JournalViewMode): string {
  switch (mode) {
    case 'newest':
      return 'Journal sorted newest first';
    case 'oldest':
      return 'Journal sorted oldest first';
    case 'byMonth':
      return 'Journal grouped by month';
    case 'byDay':
      return 'Journal grouped by weekday';
    case 'byMood':
      return 'Journal grouped by mood, showing A plus first';
    default:
      return 'Journal view updated';
  }
}

/** Next mood solo target when cycling section headers (preserves legacy tap behavior). */
export function nextMoodSoloFromHeaderTap(
  fromGrade: MoodGrade,
  currentSolo: MoodGrade | null,
  moodsWithEntries: readonly MoodGrade[]
): MoodGrade | null {
  if (moodsWithEntries.length === 0) return currentSolo;
  if (currentSolo === null) return 'A+';
  if (moodsWithEntries.length === 1) return null;
  const start = MOOD_GRADES.indexOf(fromGrade);
  for (let step = 1; step <= MOOD_GRADES.length; step += 1) {
    const g = MOOD_GRADES[(start + step) % MOOD_GRADES.length]!;
    if (moodsWithEntries.includes(g)) return g;
  }
  return moodsWithEntries[0]!;
}

export function nextWeekdaySoloFromHeaderTap(
  fromW: number,
  currentSolo: number | null,
  weekdaysWithEntries: readonly number[]
): number | null {
  if (weekdaysWithEntries.length === 0) return currentSolo;
  if (weekdaysWithEntries.length === 1) {
    return currentSolo === null ? weekdaysWithEntries[0]! : null;
  }
  const start = JOURNAL_WEEKDAY_SECTION_ORDER.indexOf(fromW as (typeof JOURNAL_WEEKDAY_SECTION_ORDER)[number]);
  const startSafe = start < 0 ? 0 : start;
  for (let step = 1; step <= JOURNAL_WEEKDAY_SECTION_ORDER.length; step += 1) {
    const w = JOURNAL_WEEKDAY_SECTION_ORDER[(startSafe + step) % JOURNAL_WEEKDAY_SECTION_ORDER.length]!;
    if (weekdaysWithEntries.includes(w)) return w;
  }
  return weekdaysWithEntries[0]!;
}

export function nextMonthSoloFromHeaderTap(
  fromMonthKey: string,
  currentSolo: string | null,
  monthKeysWithEntries: readonly string[]
): string | null {
  if (monthKeysWithEntries.length === 0) return currentSolo;
  if (monthKeysWithEntries.length === 1) {
    return currentSolo === null ? monthKeysWithEntries[0]! : null;
  }
  const start = monthKeysWithEntries.indexOf(fromMonthKey);
  const startSafe = start < 0 ? 0 : start;
  for (let step = 1; step <= monthKeysWithEntries.length; step += 1) {
    const k = monthKeysWithEntries[(startSafe + step) % monthKeysWithEntries.length]!;
    return k;
  }
  return monthKeysWithEntries[0]!;
}
