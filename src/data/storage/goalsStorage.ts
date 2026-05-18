/**
 * @fileoverview Local goals storage.
 * @module data/storage/goalsStorage
 */

import type { Goal, GoalCategory, GoalHistory, GoalMilestone, GoalReminder, GoalType, GoalsRecord } from '../../types';
import { canonicalizeGoalModel, computeGoalProgress, goalLoggedDayCount } from '../../lib/goals/goalMath';
import { getToday } from '../../lib/utils/date';
import { logger } from '../../lib/security/logger';
import { isValidISODateKey, normalizeNote } from '../model/entry';
import { assertLocalPersistenceWritable, ensureLocalPersistenceReady } from '../persistence/bootstrap';
import { storage } from './asyncStorage';

const STORAGE_KEY = 'moodly.goals';
const CORRUPT_PREFIX = `${STORAGE_KEY}.corrupt.`;
const MIGRATE_BACKUP_PREFIX = `${STORAGE_KEY}.migrate_backup.`;

/** Current persisted **goals record** revision (`GoalsRecord.version`); revision 2 derives `progress.currentValue` from history on load. Not the Moodly app semver. */
export const GOALS_RECORD_VERSION = 2 as const;

const DEFAULT_RECORD: GoalsRecord = Object.freeze({ version: GOALS_RECORD_VERSION, goalsById: {} });
const GOAL_TYPES = new Set<GoalType>(['habit', 'target', 'average', 'project']);
const CATEGORIES = new Set<GoalCategory>([
  'health',
  'fitness',
  'learning',
  'finance',
  'school',
  'work',
  'creativity',
  'wellness',
  'mindfulness',
  'personal',
  'custom',
]);
const MAX_GOAL_HISTORY = 5000;
const MAX_GOAL_MILESTONES = 100;

let cache: GoalsRecord | null = null;
let loadPromise: Promise<GoalsRecord> | null = null;
let cacheGeneration = 0;
let writeTail: Promise<void> = Promise.resolve();
let summaryCacheRecord: GoalsRecord | null = null;
let summaryCache: GoalSummary[] | null = null;

export type GoalSummary = {
  id: string;
  title: string;
  type: GoalType;
  status: Goal['status'];
  category: GoalCategory;
  accentColor: string;
  percent: number;
  streak: number;
  completedToday: boolean;
  loggedDays: number;
  durationDays?: number | null;
  updatedAt: number;
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneGoal(goal: Goal): Goal {
  return {
    ...goal,
    reminder: goal.reminder ? { ...goal.reminder, weekdays: [...goal.reminder.weekdays] } : null,
    milestones: goal.milestones.map((m) => ({ ...m })),
    history: goal.history.map((h) => ({ ...h })),
  };
}

function cloneRecord(record: GoalsRecord): GoalsRecord {
  const goalsById: Record<string, Goal> = {};
  for (const [id, goal] of Object.entries(record.goalsById)) goalsById[id] = cloneGoal(goal);
  return { version: record.version, goalsById };
}

function goalSummary(goal: Goal, today = getToday()): GoalSummary {
  const { percent, streak, completedToday, loggedDays } = computeGoalProgress(goal, today);
  return {
    id: goal.id,
    title: goal.title,
    type: goal.type,
    status: goal.status,
    category: goal.category,
    accentColor: goal.accentColor,
    percent,
    streak,
    completedToday,
    loggedDays,
    durationDays: goal.durationDays,
    updatedAt: goal.updatedAt,
  };
}

function statusRank(status: Goal['status']): number {
  return status === 'active' ? 0 : status === 'completed' ? 1 : 2;
}

function summariesForRecord(record: GoalsRecord): GoalSummary[] {
  if (summaryCacheRecord === record && summaryCache) return summaryCache;
  const summaries = Object.values(record.goalsById)
    .map((goal) => goalSummary(goal))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || b.updatedAt - a.updatedAt || a.title.localeCompare(b.title));
  if (record === cache) {
    summaryCacheRecord = record;
    summaryCache = summaries;
  }
  return summaries;
}

function normalizeReminder(raw: unknown): GoalReminder | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const frequency =
    o.frequency === 'weekly' || o.frequency === 'weekdays' || o.frequency === 'monthly' || o.frequency === 'custom'
      ? o.frequency
      : 'daily';
  const minutes =
    typeof o.minutesFromMidnight === 'number' && o.minutesFromMidnight >= 0 && o.minutesFromMidnight < 24 * 60
      ? Math.round(o.minutesFromMidnight)
      : null;
  return {
    id: typeof o.id === 'string' ? o.id : newId('goal-rem'),
    enabled: o.enabled === true,
    frequency,
    minutesFromMidnight: minutes,
    weekdays: Array.isArray(o.weekdays)
      ? o.weekdays.filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6).map((d) => Math.floor(d))
      : [],
    interval: typeof o.interval === 'number' && o.interval > 0 ? Math.floor(o.interval) : 1,
  };
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeMilestone(raw: unknown, fallbackSort: number): GoalMilestone | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : newId('goal-milestone');
  const title = typeof o.title === 'string' ? normalizeNote(o.title).slice(0, 120) : '';
  if (!title) return null;
  return {
    id,
    title,
    targetValue: Math.max(0, finiteNumber(o.targetValue, 0)),
    completedAt: finiteNumber(o.completedAt, NaN) || null,
    sortIndex: Number.isFinite(o.sortIndex) ? Math.floor(o.sortIndex as number) : fallbackSort,
  };
}

function normalizeHistory(raw: unknown): GoalHistory | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const date = typeof o.date === 'string' && isValidISODateKey(o.date) ? o.date : null;
  const value = Math.max(0, finiteNumber(o.value, NaN));
  if (!date || !Number.isFinite(value)) return null;
  return {
    id: typeof o.id === 'string' && o.id.length > 0 ? o.id : newId('goal-history'),
    date,
    value,
    note: typeof o.note === 'string' ? normalizeNote(o.note).slice(0, 240) : '',
    createdAt: finiteNumber(o.createdAt, Date.now()),
  };
}

function normalizeDurationDays(raw: unknown): number | null | undefined {
  if (raw === null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  return undefined;
}

function normalizeGoal(raw: unknown): Goal | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : null;
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!id || !title) return null;
  const type = GOAL_TYPES.has(o.type as GoalType) ? (o.type as GoalType) : 'habit';
  const category = CATEGORIES.has(o.category as GoalCategory) ? (o.category as GoalCategory) : 'personal';
  const progressRaw = o.progress as Record<string, unknown> | undefined;
  const targetValue = finiteNumber(progressRaw?.targetValue, 1);
  const currentValue = finiteNumber(progressRaw?.currentValue, 0);
  const createdAt = typeof o.createdAt === 'number' ? o.createdAt : Date.now();
  const draft: Goal = {
    id,
    type,
    status: o.status === 'completed' || o.status === 'archived' ? o.status : 'active',
    title: normalizeNote(title).slice(0, 160),
    category,
    customCategory: typeof o.customCategory === 'string' ? o.customCategory : null,
    accentColor: typeof o.accentColor === 'string' ? o.accentColor : '#FF9500',
    progress: {
      currentValue,
      targetValue: targetValue > 0 ? targetValue : 1,
      unit: typeof progressRaw?.unit === 'string'
        ? normalizeNote(progressRaw.unit).slice(0, 24)
        : '',
      frequency:
        progressRaw?.frequency === 'daily' ||
        progressRaw?.frequency === 'weekly' ||
        progressRaw?.frequency === 'monthly'
          ? progressRaw.frequency
          : 'none',
    },
    reminder: normalizeReminder(o.reminder),
    milestones: Array.isArray(o.milestones)
      ? o.milestones.map((m, i) => normalizeMilestone(m, i)).filter((m): m is GoalMilestone => !!m).slice(0, MAX_GOAL_MILESTONES)
      : [],
    history: Array.isArray(o.history)
      ? o.history.map(normalizeHistory).filter((h): h is GoalHistory => !!h).slice(-MAX_GOAL_HISTORY)
      : [],
    notes: typeof o.notes === 'string' ? normalizeNote(o.notes).slice(0, 1000) : '',
    durationDays: normalizeDurationDays(o.durationDays),
    createdAt,
    updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : createdAt,
    completedAt: typeof o.completedAt === 'number' ? o.completedAt : null,
    archivedAt: typeof o.archivedAt === 'number' ? o.archivedAt : null,
  };
  return canonicalizeGoalModel(draft);
}

function parseRecord(json: string | null): { record: GoalsRecord; corrupt: boolean; wasMigrated: boolean } {
  if (!json) return { record: cloneRecord(DEFAULT_RECORD), corrupt: false, wasMigrated: false };
  try {
    const raw = JSON.parse(json) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { record: cloneRecord(DEFAULT_RECORD), corrupt: true, wasMigrated: false };
    }
    const rawObj = raw as Record<string, unknown>;
    const incomingVersion = rawObj.version === GOALS_RECORD_VERSION ? GOALS_RECORD_VERSION : 1;
    const rawGoals = rawObj.goalsById;
    const goalsById: Record<string, Goal> = {};
    if (rawGoals && typeof rawGoals === 'object') {
      for (const [id, goalRaw] of Object.entries(rawGoals as Record<string, unknown>)) {
        const goal = normalizeGoal({ ...(goalRaw as Record<string, unknown>), id });
        if (goal) goalsById[goal.id] = goal;
      }
    }
    const wasMigrated = incomingVersion < GOALS_RECORD_VERSION;
    return { record: { version: GOALS_RECORD_VERSION, goalsById }, corrupt: false, wasMigrated };
  } catch {
    return { record: cloneRecord(DEFAULT_RECORD), corrupt: true, wasMigrated: false };
  }
}

async function backupPreMigrationSnapshot(rawJson: string): Promise<void> {
  try {
    await storage.setItem(`${MIGRATE_BACKUP_PREFIX}${Date.now()}`, rawJson);
  } catch (error) {
    logger.warn('storage.goals.migrateBackup.persistFailed', { error });
  }
}

async function quarantineCorruptValue(rawJson: string): Promise<void> {
  try {
    await storage.setItem(`${CORRUPT_PREFIX}${Date.now()}`, rawJson);
  } catch (error) {
    logger.warn('storage.goals.corruptBackup.persistFailed', { error });
  }
  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RECORD));
  } catch (error) {
    logger.error('storage.goals.corruptReset.failed', { error });
  }
}

async function readFromDisk(): Promise<GoalsRecord> {
  await ensureLocalPersistenceReady();
  const json = await storage.getItem(STORAGE_KEY);
  const parsed = parseRecord(json);
  if (parsed.corrupt && typeof json === 'string' && json.length > 0) {
    logger.warn('storage.goals.corrupt.detected', { action: 'quarantineAndReset' });
    await quarantineCorruptValue(json);
    return parsed.record;
  }
  if (!parsed.corrupt && parsed.wasMigrated && typeof json === 'string' && json.length > 0) {
    await backupPreMigrationSnapshot(json);
    try {
      await withWriteLock(async () => {
        await persistGoalsRecordCore(cloneRecord(parsed.record));
      });
    } catch (error) {
      logger.warn('storage.goals.migrate.persistFailed', { error });
    }
  }
  return parsed.record;
}

async function withWriteLock<T>(op: () => Promise<T>): Promise<T> {
  const prev = writeTail;
  let release!: () => void;
  writeTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    return await op();
  } finally {
    release();
  }
}

async function getRecord(): Promise<GoalsRecord> {
  try {
    if (cache) return cache;
    await ensureLocalPersistenceReady();
    if (loadPromise) return loadPromise;
    const generationAtStart = cacheGeneration;
    loadPromise = readFromDisk().then((next) => {
      if (cacheGeneration === generationAtStart) cache = next;
      return next;
    });
    const result = await loadPromise;
    loadPromise = null;
    return result;
  } catch (error) {
    loadPromise = null;
    logger.warn('storage.goals.load.failed', { error });
    return cloneRecord(DEFAULT_RECORD);
  }
}

async function persistGoalsRecordCore(record: GoalsRecord): Promise<void> {
  await ensureLocalPersistenceReady();
  assertLocalPersistenceWritable();
  const safeNext = cloneRecord({ ...record, version: GOALS_RECORD_VERSION });
  await storage.setItem(STORAGE_KEY, JSON.stringify(safeNext));
  cacheGeneration += 1;
  loadPromise = null;
  summaryCacheRecord = null;
  summaryCache = null;
  cache = safeNext;
}

async function persistRecord(record: GoalsRecord): Promise<void> {
  await persistGoalsRecordCore(record);
}

export async function getGoals(): Promise<Goal[]> {
  const record = await getRecord();
  return Object.values(record.goalsById).map(cloneGoal);
}

export async function getGoalById(goalId: string): Promise<Goal | null> {
  const goal = (await getRecord()).goalsById[goalId];
  return goal ? cloneGoal(goal) : null;
}

export async function getGoalSummaries(): Promise<GoalSummary[]> {
  return summariesForRecord(await getRecord()).map((summary) => ({ ...summary }));
}

export async function getTodayGoalSummaries(limit = 3): Promise<GoalSummary[]> {
  const record = await getRecord();
  const today = getToday();
  const active = Object.values(record.goalsById).filter((g) => g.status === 'active');
  active.sort((a, b) => b.updatedAt - a.updatedAt || a.title.localeCompare(b.title));
  return active.slice(0, Math.max(0, limit)).map((g) => ({ ...goalSummary(g, today) }));
}

/**
 * Dev-only: replace the entire goals map (destructive). Goals are normalized like disk loads.
 */
export async function replaceAllGoalsForDev(goals: readonly Goal[]): Promise<void> {
  return withWriteLock(async () => {
    const goalsById: Record<string, Goal> = {};
    for (const raw of goals) {
      const goal = normalizeGoal(raw);
      if (goal) goalsById[goal.id] = goal;
    }
    await persistRecord({ version: GOALS_RECORD_VERSION, goalsById });
  });
}

export async function upsertGoal(input: Partial<Goal> & Pick<Goal, 'title' | 'type'>): Promise<Goal> {
  const now = Date.now();
  return withWriteLock(async () => {
    const record = cloneRecord(await getRecord());
    const existing = input.id ? record.goalsById[input.id] : null;
    const id = existing?.id ?? input.id ?? newId('goal');
    const goal = normalizeGoal({
      id,
      type: input.type,
      status: input.status ?? existing?.status ?? 'active',
      title: input.title.trim(),
      category: input.category ?? existing?.category ?? 'personal',
      customCategory: input.customCategory ?? existing?.customCategory ?? null,
      accentColor: input.accentColor ?? existing?.accentColor ?? '#FF9500',
      progress: input.progress ?? existing?.progress ?? { currentValue: 0, targetValue: 1, unit: '', frequency: 'none' },
      reminder: input.reminder ?? existing?.reminder ?? null,
      milestones: input.milestones ?? existing?.milestones ?? [],
      history: input.history ?? existing?.history ?? [],
      notes: input.notes ?? existing?.notes ?? '',
      durationDays: input.durationDays !== undefined ? input.durationDays : existing?.durationDays,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      completedAt: input.completedAt ?? existing?.completedAt ?? null,
      archivedAt: input.archivedAt ?? existing?.archivedAt ?? null,
    });
    if (!goal || !goal.title) throw new Error('[goalsStorage] Goal title is required');
    record.goalsById[id] = goal;
    await persistRecord(record);
    return cloneGoal(goal);
  });
}

export async function addGoalProgress(goalId: string, date: string, value: number, noteRaw = ''): Promise<Goal | null> {
  if (!isValidISODateKey(date) || !Number.isFinite(value) || value < 0) return null;
  return withWriteLock(async () => {
    const record = cloneRecord(await getRecord());
    const goal = record.goalsById[goalId];
    if (!goal) return null;
    if (goal.status !== 'active') return cloneGoal(goal);
    const now = Date.now();
    const note = normalizeNote(noteRaw).slice(0, 240);
    const existingHistoryIndex = goal.history.findIndex((item) => item.date === date);
    let nextHistory: GoalHistory[];
    if (existingHistoryIndex >= 0) {
      const existing = goal.history[existingHistoryIndex]!;
      if (existing.note === note && existing.value === value) return cloneGoal(goal);
      nextHistory = goal.history.map((item, index) =>
        index === existingHistoryIndex ? { ...item, note, value, createdAt: now } : item
      );
    } else {
      nextHistory = [
        ...goal.history,
        { id: newId('goal-history'), date, value, note, createdAt: now },
      ].slice(-MAX_GOAL_HISTORY);
    }
    let next = canonicalizeGoalModel({
      ...goal,
      history: nextHistory,
      updatedAt: now,
    });
    const uniqueLoggedDays = goalLoggedDayCount(next.history);
    const completionTarget =
      typeof next.durationDays === 'number' && next.durationDays > 0
        ? next.durationDays
        : next.durationDays === null
          ? null
          : next.progress.targetValue;
    if (
      completionTarget != null &&
      completionTarget > 0 &&
      uniqueLoggedDays >= completionTarget &&
      next.status === 'active'
    ) {
      next = { ...next, status: 'completed', completedAt: now };
    }
    record.goalsById[goalId] = next;
    await persistRecord(record);
    return cloneGoal(next);
  });
}

export async function completeGoal(goalId: string): Promise<Goal | null> {
  return withWriteLock(async () => {
    const record = cloneRecord(await getRecord());
    const goal = record.goalsById[goalId];
    if (!goal || goal.status !== 'active') return goal ? cloneGoal(goal) : null;
    const now = Date.now();
    const next = { ...goal, status: 'completed' as const, completedAt: now, updatedAt: now };
    record.goalsById[goalId] = canonicalizeGoalModel(next);
    await persistRecord(record);
    return cloneGoal(record.goalsById[goalId]!);
  });
}

export async function archiveGoal(goalId: string): Promise<void> {
  return withWriteLock(async () => {
    const record = cloneRecord(await getRecord());
    const goal = record.goalsById[goalId];
    if (!goal) return;
    record.goalsById[goalId] = { ...goal, status: 'archived', archivedAt: Date.now(), updatedAt: Date.now() };
    await persistRecord(record);
  });
}

export async function deleteGoal(goalId: string): Promise<void> {
  return withWriteLock(async () => {
    const record = cloneRecord(await getRecord());
    delete record.goalsById[goalId];
    await persistRecord(record);
  });
}

export function resetGoalsStorageSessionStateForTests(): void {
  if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') return;
  cache = null;
  loadPromise = null;
  cacheGeneration = 0;
  writeTail = Promise.resolve();
  summaryCacheRecord = null;
  summaryCache = null;
}

/** @internal Jest only — parse goals JSON without touching caches or disk. */
export function testParseGoalsDiskJson(json: string | null): {
  record: GoalsRecord;
  corrupt: boolean;
  wasMigrated: boolean;
} {
  if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
    throw new Error('[goalsStorage] testParseGoalsDiskJson is test-only');
  }
  return parseRecord(json);
}
