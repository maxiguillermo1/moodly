/**
 * @fileoverview Composed **Daily Activity** read model (local-first, no UI imports).
 * @module data/repositories/dailyActivityRepository
 *
 * **Read-only:** callers must keep using domain repositories for writes (`entriesRepository`,
 * `extensionsRepository`, `goalsRepository`, `tasksRepository`, …). This module **never** mutates
 * `kairo.entries`, habits, goals, or task shards.
 *
 * **Source of truth:** underlying AsyncStorage-backed stores listed in `docs/DATA_ARCHITECTURE.md`.
 * All fields here are **derived** from those stores except echoed keys (`date`) and compose metadata.
 */

import type { HabitId } from '../../types/habits.types';
import type {
  DayActivity,
  DayActivityCalendarSection,
  DayActivityGoalItem,
  DayActivityGoalsSection,
  DayActivityHabitsSection,
  DayActivityJournalSection,
  DayActivityMetadata,
  DayActivityMoodSection,
  DayActivityReminderItem,
  DayActivityRemindersSection,
  DayActivitySummarySection,
  LocalDateKey,
} from '../../types/dailyActivity.types';
import type { Goal } from '../../types/goals.types';
import type { MoodEntry } from '../../types/mood.types';
import type { DayTodoItem } from '../../types/todo.types';
import { computeGoalProgress, canonicalizeGoalModel } from '../../lib/goals/goalMath';
import { getToday, parseISODate, toLocalDayKey } from '../../lib/utils/date';
import { isValidISODateKey, normalizeNote } from '../model/entry';
import { ensureLocalPersistenceReady } from '../persistence/bootstrap';
import { getHabitSelectionsRecordSnapshot, getHabitSelectionsForDate } from '../storage/habitSelectionsStorage';
import { getTrackedHabitIds } from '../storage/habitTrackingStorage';
import { getAllEntries, getEntry } from '../storage/moodStorage';
import { getGoals } from '../storage/goalsStorage';
import { getTasksForDate } from '../storage/tasksStorage';
import { logger } from '../../lib/security/logger';

/** Hard cap for one `getDayActivityRange` call (protects memory / frame time). */
export const MAX_DAILY_ACTIVITY_RANGE_DAYS = 4000;

/**
 * Max concurrent `getTasksForDate` reads inside one `getDayActivityRange` compose.
 * Without batching, a max-range call could schedule thousands of parallel AsyncStorage reads
 * (memory pressure + queue contention on real devices).
 */
const DAILY_ACTIVITY_REMINDER_FETCH_CONCURRENCY = 48;

/** Max goals evaluated per day (after filtering to `active`); keeps composition bounded. */
const MAX_ACTIVE_GOALS_PER_DAY = 200;

const NOTE_PREVIEW_LEN = 200;

function monthKeyFromDateKey(date: LocalDateKey): string {
  return date.length >= 7 ? date.slice(0, 7) : '';
}

function safeNormalizeNotePreview(note: unknown): string {
  return normalizeNote(typeof note === 'string' ? note : '').slice(0, NOTE_PREVIEW_LEN);
}

function emptyMood(): DayActivityMoodSection {
  return { present: false, grade: null, hasEntry: false };
}

function emptyJournal(): DayActivityJournalSection {
  return { present: false, notePreview: '', updatedAt: null };
}

function emptyHabits(): DayActivityHabitsSection {
  return { selectedIds: [], trackedIds: [] };
}

function emptyGoals(): DayActivityGoalsSection {
  return { items: [] };
}

function emptyReminders(): DayActivityRemindersSection {
  return { items: [] };
}

function emptyCalendar(date: LocalDateKey): DayActivityCalendarSection {
  return { monthKey: monthKeyFromDateKey(date), hasMoodEntry: false, moodGrade: null };
}

function emptySummary(): DayActivitySummarySection {
  return {
    counts: { mood: 0, journalNote: 0, habits: 0, goalsWithProgress: 0, reminders: 0 },
    hasAnyActivity: false,
  };
}

function buildMetadata(date: LocalDateKey, warnings: string[], rangeTruncated?: boolean): DayActivityMetadata {
  return {
    composedAt: Date.now(),
    date,
    rangeTruncated,
    warnings,
  };
}

function moodSectionFromEntry(entry: MoodEntry | null | undefined): DayActivityMoodSection {
  if (!entry) return emptyMood();
  return {
    present: true,
    grade: entry.mood,
    hasEntry: true,
  };
}

function journalSectionFromEntry(entry: MoodEntry | null | undefined): DayActivityJournalSection {
  if (!entry) return emptyJournal();
  const note = safeNormalizeNotePreview(entry.note);
  return {
    present: note.length > 0,
    notePreview: note,
    updatedAt: typeof entry.updatedAt === 'number' ? entry.updatedAt : null,
  };
}

function calendarSection(date: LocalDateKey, entry: MoodEntry | null | undefined): DayActivityCalendarSection {
  return {
    monthKey: monthKeyFromDateKey(date),
    hasMoodEntry: !!entry,
    moodGrade: entry?.mood ?? null,
  };
}

function mapReminderItems(items: readonly DayTodoItem[]): DayActivityReminderItem[] {
  return items.map((t) => ({
    id: t.id,
    title: normalizeNote(t.title).slice(0, 200),
    done: t.done === true,
    sortIndex: typeof t.sortIndex === 'number' ? t.sortIndex : 0,
    reminderMinutes: t.reminderMinutes ?? null,
  }));
}

/** Per-goal canon: one corrupt row must not drop the whole day read model. */
function canonicalizeGoalsForReadModel(goals: readonly Goal[]): Goal[] {
  const out: Goal[] = [];
  for (const g of goals) {
    try {
      out.push(canonicalizeGoalModel(g));
    } catch {
      const id = typeof g?.id === 'string' ? g.id : 'unknown';
      logger.warn('dailyActivity.goal.skipCanon', { goalId: id });
    }
  }
  return out;
}

function goalsSectionForDate(goalsCanon: readonly Goal[], date: LocalDateKey): DayActivityGoalsSection {
  const items: DayActivityGoalItem[] = [];
  let n = 0;
  for (const g of goalsCanon) {
    if (g.status !== 'active') continue;
    if (n >= MAX_ACTIVE_GOALS_PER_DAY) break;
    n += 1;
    const prog = computeGoalProgress(g, date);
    const row = g.history.find((h) => h.date === date);
    items.push({
      id: g.id,
      title: g.title,
      type: g.type,
      status: g.status,
      percent: prog.percent,
      streak: prog.streak,
      completedToday: prog.completedToday,
      valueOnDate: row && Number.isFinite(row.value) ? row.value : null,
    });
  }
  return { items };
}

function summaryFromParts(args: {
  mood: DayActivityMoodSection;
  journal: DayActivityJournalSection;
  habits: DayActivityHabitsSection;
  goals: DayActivityGoalsSection;
  reminders: DayActivityRemindersSection;
}): DayActivitySummarySection {
  const habitsCount = args.habits.selectedIds.length;
  const goalsWithProgress = args.goals.items.filter((g) => g.completedToday || (g.valueOnDate != null && g.valueOnDate > 0)).length;
  const counts = {
    mood: args.mood.hasEntry ? (1 as const) : (0 as const),
    journalNote: args.journal.present ? (1 as const) : (0 as const),
    habits: habitsCount,
    goalsWithProgress,
    reminders: args.reminders.items.length,
  };
  const hasAnyActivity =
    counts.mood > 0 ||
    counts.journalNote > 0 ||
    counts.habits > 0 ||
    counts.goalsWithProgress > 0 ||
    counts.reminders > 0;
  return { counts, hasAnyActivity };
}

function buildDayActivityCore(
  date: LocalDateKey,
  entry: MoodEntry | null | undefined,
  habitSelected: readonly HabitId[],
  trackedIds: readonly HabitId[],
  goalsCanon: readonly Goal[],
  reminders: readonly DayTodoItem[],
  warnings: string[],
  rangeTruncated?: boolean
): DayActivity {
  const mood = moodSectionFromEntry(entry);
  const journal = journalSectionFromEntry(entry);
  const habits: DayActivityHabitsSection = {
    selectedIds: [...habitSelected],
    trackedIds: [...trackedIds],
  };
  const goals = goalsSectionForDate(goalsCanon, date);
  const rem: DayActivityRemindersSection = { items: mapReminderItems(reminders) };
  const calendar = calendarSection(date, entry);
  const summary = summaryFromParts({ mood, journal, habits, goals, reminders: rem });
  return {
    date,
    mood,
    journal,
    habits,
    goals,
    reminders: rem,
    calendar,
    summary,
    metadata: buildMetadata(date, warnings, rangeTruncated),
  };
}

/** Invalid or non-calendar `date` → safe empty row (caller checks `metadata.warnings`). */
export function emptyDayActivity(date: string, warning: string): DayActivity {
  const dk = date as LocalDateKey;
  return {
    date: dk,
    mood: emptyMood(),
    journal: emptyJournal(),
    habits: emptyHabits(),
    goals: emptyGoals(),
    reminders: emptyReminders(),
    calendar: emptyCalendar(isValidISODateKey(date) ? date : '1970-01-01'),
    summary: emptySummary(),
    metadata: buildMetadata(dk, [warning]),
  };
}

function compareIsoDateKeys(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Enumerate inclusive local dates from `start` through `end` (order normalized).
 * Returns `null` when keys are invalid; may truncate to {@link MAX_DAILY_ACTIVITY_RANGE_DAYS}.
 */
export function enumerateLocalDateRangeInclusive(
  start: LocalDateKey,
  end: LocalDateKey
): { dates: LocalDateKey[]; truncated: boolean; warnings: string[] } | null {
  if (!isValidISODateKey(start) || !isValidISODateKey(end)) return null;
  const warnings: string[] = [];
  const lo = compareIsoDateKeys(start, end) <= 0 ? start : end;
  const hi = compareIsoDateKeys(start, end) <= 0 ? end : start;
  const startDt = parseISODate(lo);
  const endDt = parseISODate(hi);
  if (!Number.isFinite(startDt.getTime()) || !Number.isFinite(endDt.getTime())) return null;
  const out: LocalDateKey[] = [];
  let truncated = false;
  const cursor = new Date(startDt.getTime());
  while (cursor.getTime() <= endDt.getTime()) {
    if (out.length >= MAX_DAILY_ACTIVITY_RANGE_DAYS) {
      truncated = true;
      warnings.push('range_truncated');
      break;
    }
    out.push(toLocalDayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return { dates: out, truncated, warnings };
}

export async function getDayActivity(date: LocalDateKey): Promise<DayActivity> {
  await ensureLocalPersistenceReady();
  if (!isValidISODateKey(date)) {
    logger.warn('dailyActivity.invalidDate', { dateLen: String(date).length });
    return emptyDayActivity(date, 'invalid_date');
  }
  try {
    const [entry, habitSelected, trackedIds, goalsRaw, reminders] = await Promise.all([
      getEntry(date),
      getHabitSelectionsForDate(date),
      getTrackedHabitIds(),
      getGoals(),
      getTasksForDate(date),
    ]);
    const goalsCanon = canonicalizeGoalsForReadModel(goalsRaw);
    return buildDayActivityCore(date, entry ?? null, habitSelected, trackedIds, goalsCanon, reminders, []);
  } catch (error) {
    logger.warn('dailyActivity.compose.failed', { error });
    return emptyDayActivity(date, 'compose_failed');
  }
}

export async function getTodayActivity(): Promise<DayActivity> {
  return getDayActivity(getToday());
}

export async function getDayActivityRange(
  startDate: LocalDateKey,
  endDate: LocalDateKey
): Promise<Record<LocalDateKey, DayActivity>> {
  await ensureLocalPersistenceReady();
  const enumerated = enumerateLocalDateRangeInclusive(startDate, endDate);
  if (!enumerated) {
    const bad = emptyDayActivity(startDate, 'invalid_range');
    return { [startDate]: bad };
  }
  const { dates, truncated, warnings: rangeWarnings } = enumerated;
  const out: Record<LocalDateKey, DayActivity> = {};

  try {
    const [entriesRecord, habitSnap, trackedIds, goalsRaw] = await Promise.all([
      getAllEntries(),
      getHabitSelectionsRecordSnapshot(),
      getTrackedHabitIds(),
      getGoals(),
    ]);
    const goalsCanon = canonicalizeGoalsForReadModel(goalsRaw);

    const reminderLists: DayTodoItem[][] = [];
    for (let offset = 0; offset < dates.length; offset += DAILY_ACTIVITY_REMINDER_FETCH_CONCURRENCY) {
      const slice = dates.slice(offset, offset + DAILY_ACTIVITY_REMINDER_FETCH_CONCURRENCY);
      const batch = await Promise.all(slice.map((d) => getTasksForDate(d)));
      reminderLists.push(...batch);
    }

    dates.forEach((date, i) => {
      const entry = entriesRecord[date] ?? null;
      const habitSelected = habitSnap[date] ?? [];
      const reminders = reminderLists[i] ?? [];
      const mergedWarnings = [...rangeWarnings];
      out[date] = buildDayActivityCore(
        date,
        entry,
        habitSelected,
        trackedIds,
        goalsCanon,
        reminders,
        mergedWarnings,
        truncated || undefined
      );
    });
  } catch (error) {
    logger.warn('dailyActivity.range.failed', { error });
    for (const date of dates) {
      out[date] = emptyDayActivity(date, 'range_compose_failed');
    }
  }
  return out;
}

export const dailyActivityRepository = {
  getDayActivity,
  getDayActivityRange,
  getTodayActivity,
  enumerateLocalDateRangeInclusive,
  MAX_DAILY_ACTIVITY_RANGE_DAYS,
} as const;

export type IDailyActivityRepository = typeof dailyActivityRepository;
