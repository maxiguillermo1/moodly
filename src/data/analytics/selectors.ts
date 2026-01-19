/**
 * @fileoverview Pure analytics selectors over Moodly entries.
 * @module data/analytics/selectors
 *
 * Design goals:
 * - deterministic outputs
 * - no side effects
 * - safe to run in UI without triggering re-renders (callers can memoize)
 * - scalable: caches derived views by input object reference
 */

import type { MoodEntriesRecord, MoodEntry, MoodGrade } from '../../types';
import { moodToScore, isValidISODateKey, VALID_MOOD_GRADES } from '../model/entry';
import type { DailyRow, MonthlyAggregate, WeeklyAggregate, MoodDistribution, Streaks, MoodScore } from './types';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function monthKeyFromDate(date: string) {
  return date.slice(0, 7); // YYYY-MM
}

function parseDateParts(date: string) {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const d = Number(date.slice(8, 10));
  return { y, m, d };
}

function daysInMonth(y: number, m1: number) {
  return new Date(y, m1, 0).getDate();
}

function emptyDistribution(): MoodDistribution {
  return { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
}

function incDist(dist: MoodDistribution, mood: MoodGrade) {
  dist[mood] = (dist[mood] ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// ISO Week helpers (no deps)
// ---------------------------------------------------------------------------

function isoWeekOf(dateStr: string): { isoYear: number; isoWeek: number; weekKey: string } {
  const { y, m, d } = parseDateParts(dateStr);
  // Create date in local time; we only use date components.
  const date = new Date(y, m - 1, d);
  // ISO: week starts Monday; convert so Monday=0..Sunday=6
  const day = (date.getDay() + 6) % 7;
  // Thursday of this week determines ISO year
  const thursday = new Date(date);
  thursday.setDate(date.getDate() - day + 3);
  const isoYear = thursday.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  const firstWeekThursday = new Date(firstThursday);
  firstWeekThursday.setDate(firstThursday.getDate() - firstDay + 3);
  const diffMs = thursday.getTime() - firstWeekThursday.getTime();
  const isoWeek = 1 + Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  const weekKey = `${isoYear}-W${pad2(isoWeek)}`;
  return { isoYear, isoWeek, weekKey };
}

// ---------------------------------------------------------------------------
// Caching (by object identity)
// ---------------------------------------------------------------------------

type Cache = {
  sortedDesc?: MoodEntry[];
  dailyRowsFilled?: DailyRow[];
  monthly?: MonthlyAggregate[];
  weekly?: WeeklyAggregate[];
  streaks?: Streaks;
  distribution?: MoodDistribution;
};

const cacheByEntries = new WeakMap<object, Cache>();

function getCache(entries: MoodEntriesRecord): Cache {
  let c = cacheByEntries.get(entries as any);
  if (!c) {
    c = {};
    cacheByEntries.set(entries as any, c);
  }
  return c;
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function selectEntriesSortedDesc(entries: MoodEntriesRecord): MoodEntry[] {
  const c = getCache(entries);
  if (c.sortedDesc) return c.sortedDesc;
  const arr = Object.values(entries).slice();
  arr.sort((a, b) => b.date.localeCompare(a.date));
  c.sortedDesc = arr;
  return arr;
}

/**
 * Build a daily series across the min..max date range.
 * Missing days are included with `hasEntry=false`.
 */
export function selectDailyRowsFilled(entries: MoodEntriesRecord): DailyRow[] {
  const c = getCache(entries);
  if (c.dailyRowsFilled) return c.dailyRowsFilled;

  const keys = Object.keys(entries).filter(isValidISODateKey).sort();
  if (keys.length === 0) {
    c.dailyRowsFilled = [];
    return c.dailyRowsFilled;
  }

  const start = keys[0]!;
  const end = keys[keys.length - 1]!;
  const { y: sy, m: sm, d: sd } = parseDateParts(start);
  const { y: ey, m: em, d: ed } = parseDateParts(end);

  const rows: DailyRow[] = [];
  let cy = sy, cm = sm, cd = sd;
  while (true) {
    const date = `${cy}-${pad2(cm)}-${pad2(cd)}`;
    const e = entries[date];
    if (e) {
      const score = moodToScore(e.mood) as MoodScore;
      rows.push({
        date,
        y: cy,
        m: cm,
        d: cd,
        hasEntry: true,
        mood: e.mood,
        moodScore: score,
        noteLen: e.note?.length ?? 0,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      });
    } else {
      rows.push({ date, y: cy, m: cm, d: cd, hasEntry: false });
    }

    if (cy === ey && cm === em && cd === ed) break;

    cd += 1;
    const dim = daysInMonth(cy, cm);
    if (cd > dim) {
      cd = 1;
      cm += 1;
      if (cm > 12) {
        cm = 1;
        cy += 1;
      }
    }
  }

  c.dailyRowsFilled = rows;
  return rows;
}

export function selectMoodDistribution(entries: MoodEntriesRecord): MoodDistribution {
  const c = getCache(entries);
  if (c.distribution) return c.distribution;
  const dist = emptyDistribution();
  for (const e of Object.values(entries)) {
    if (!e) continue;
    if (!VALID_MOOD_GRADES.includes(e.mood)) continue;
    incDist(dist, e.mood);
  }
  c.distribution = dist;
  return dist;
}

export function selectMonthlyAggregates(entries: MoodEntriesRecord): MonthlyAggregate[] {
  const c = getCache(entries);
  if (c.monthly) return c.monthly;

  const byMonth = new Map<string, MonthlyAggregate>();

  for (const e of Object.values(entries)) {
    if (!e || !isValidISODateKey(e.date)) continue;
    const mk = monthKeyFromDate(e.date);
    const { y, m } = parseDateParts(e.date);
    let agg = byMonth.get(mk);
    if (!agg) {
      agg = {
        monthKey: mk,
        y,
        m,
        daysWithEntry: 0,
        avgMoodScore: null,
        distribution: emptyDistribution(),
        notesCount: 0,
        totalNoteChars: 0,
      };
      byMonth.set(mk, agg);
    }
    agg.daysWithEntry += 1;
    incDist(agg.distribution, e.mood);
    const score = moodToScore(e.mood);
    // avg computed later for determinism
    (agg as any)._sumScore = ((agg as any)._sumScore ?? 0) + score;
    if ((e.note ?? '').trim().length > 0) {
      agg.notesCount += 1;
      agg.totalNoteChars += e.note.length;
    }
  }

  const res = Array.from(byMonth.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((m) => {
      const sum = (m as any)._sumScore ?? 0;
      delete (m as any)._sumScore;
      return {
        ...m,
        avgMoodScore: m.daysWithEntry > 0 ? sum / m.daysWithEntry : null,
      };
    });

  c.monthly = res;
  return res;
}

export function selectWeeklyAggregates(entries: MoodEntriesRecord): WeeklyAggregate[] {
  const c = getCache(entries);
  if (c.weekly) return c.weekly;

  const byWeek = new Map<string, WeeklyAggregate & { _sumScore?: number }>();

  for (const e of Object.values(entries)) {
    if (!e || !isValidISODateKey(e.date)) continue;
    const wk = isoWeekOf(e.date);
    let agg = byWeek.get(wk.weekKey);
    if (!agg) {
      agg = {
        weekKey: wk.weekKey,
        isoYear: wk.isoYear,
        isoWeek: wk.isoWeek,
        daysWithEntry: 0,
        avgMoodScore: null,
        distribution: emptyDistribution(),
      };
      byWeek.set(wk.weekKey, agg);
    }
    agg.daysWithEntry += 1;
    incDist(agg.distribution, e.mood);
    agg._sumScore = (agg._sumScore ?? 0) + moodToScore(e.mood);
  }

  const res = Array.from(byWeek.values())
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
    .map((w) => {
      const sum = w._sumScore ?? 0;
      const rest: WeeklyAggregate = {
        weekKey: w.weekKey,
        isoYear: w.isoYear,
        isoWeek: w.isoWeek,
        daysWithEntry: w.daysWithEntry,
        avgMoodScore: null,
        distribution: w.distribution,
      };
      return {
        ...rest,
        avgMoodScore: rest.daysWithEntry > 0 ? sum / rest.daysWithEntry : null,
      };
    });

  c.weekly = res;
  return res;
}

/**
 * Streaks are computed over the filled daily series.
 * - A day counts towards streak if there is an entry.
 */
export function selectStreaks(entries: MoodEntriesRecord): Streaks {
  const c = getCache(entries);
  if (c.streaks) return c.streaks;

  const rows = selectDailyRowsFilled(entries);
  let longest = 0;
  let cur = 0;
  for (const r of rows) {
    if (r.hasEntry) {
      cur += 1;
      if (cur > longest) longest = cur;
    } else {
      cur = 0;
    }
  }

  // Current streak: count backwards from end
  let current = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i]!.hasEntry) current += 1;
    else break;
  }

  c.streaks = { currentStreakDays: current, longestStreakDays: longest };
  return c.streaks;
}

