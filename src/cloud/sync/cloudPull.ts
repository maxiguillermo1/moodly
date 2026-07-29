/**
 * @fileoverview Pull Supabase Postgres data into local SQLite/AsyncStorage cache.
 * @module cloud/sync/cloudPull
 */

import type { User } from '@supabase/supabase-js';
import type { MoodEntry, MoodEntriesRecord } from '../../types/mood.types';
import type { GoalsRecord } from '../../types/goals.types';
import type { AppSettings } from '../../types/settings.types';
import type { HabitId } from '../../lib/constants/habitsCatalog';
import { isHabitId } from '../../lib/constants/habitsCatalog';
import { isValidISODateKey } from '../../data/model/entry';
import { getSupabaseClient } from '../supabase/client';
import type { CloudPullResult, HabitSelectionsSnapshot } from './types';
import { mergeMoodEntries } from './moodMerge';

type MoodRow = {
  date: string;
  mood: string;
  note: string;
  created_at_ms: number;
  updated_at_ms: number;
  deleted_at: string | null;
};

type HabitRow = { date: string; habit_id: string };
type GoalRow = { id: string; payload_json: Record<string, unknown>; updated_at_ms: number };
type ProgressRow = {
  goal_id: string;
  date: string;
  value: number;
  note: string;
  created_at_ms: number;
  updated_at_ms: number;
};

export type CloudPullApplier = {
  getLocalMoodEntries: () => Promise<MoodEntriesRecord>;
  applyMoodEntries: (record: MoodEntriesRecord) => Promise<void>;
  applyHabitSelections: (selections: HabitSelectionsSnapshot) => Promise<void>;
  applyTrackedHabitIds: (ids: HabitId[]) => Promise<void>;
  applyGoalsRecord: (record: GoalsRecord) => Promise<void>;
  applySettings: (settings: AppSettings) => Promise<void>;
  applyTasksRecord: (record: Record<string, unknown>) => Promise<void>;
  applyTaskDayItems: (date: string, items: unknown[]) => Promise<void>;
  applyInsightsTiming: (payload: Record<string, unknown>) => Promise<void>;
};

function parseCloudMoods(rows: MoodRow[] | null | undefined): MoodEntriesRecord {
  const cloudMoods: MoodEntriesRecord = {};
  for (const row of rows ?? []) {
    if (row.deleted_at) continue;
    if (!isValidISODateKey(row.date)) continue;
    cloudMoods[row.date] = {
      date: row.date,
      mood: row.mood as MoodEntry['mood'],
      note: row.note ?? '',
      createdAt: row.created_at_ms,
      updatedAt: row.updated_at_ms,
    };
  }
  return cloudMoods;
}

function parseHabitSelections(rows: HabitRow[] | null | undefined): HabitSelectionsSnapshot {
  const selections: HabitSelectionsSnapshot = {};
  for (const row of rows ?? []) {
    if (!isValidISODateKey(row.date) || !isHabitId(row.habit_id)) continue;
    (selections[row.date] ||= []).push(row.habit_id);
  }
  return selections;
}

function buildGoalsRecord(
  goalRows: GoalRow[] | null | undefined,
  progressRows: ProgressRow[] | null | undefined
): GoalsRecord['goalsById'] {
  const progressByGoal = new Map<string, ProgressRow[]>();
  for (const row of progressRows ?? []) {
    const list = progressByGoal.get(row.goal_id) ?? [];
    list.push(row);
    progressByGoal.set(row.goal_id, list);
  }

  const goalsById: GoalsRecord['goalsById'] = {};
  for (const row of goalRows ?? []) {
    const base = row.payload_json as GoalsRecord['goalsById'][string];
    if (!base?.id) continue;
    const history = (progressByGoal.get(row.id) ?? []).map((p) => ({
      id: `${p.goal_id}:${p.date}`,
      date: p.date,
      value: p.value,
      note: p.note ?? '',
      createdAt: p.created_at_ms,
    }));
    goalsById[row.id] = { ...base, history };
  }
  return goalsById;
}

export async function pullCloudDataToLocal(user: User, applier: CloudPullApplier): Promise<CloudPullResult> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client unavailable');

  const userId = user.id;
  const pulledAtMs = Date.now();

  const [
    moodResult,
    habitResult,
    trackedResult,
    goalResult,
    progressResult,
    settingsResult,
    tasksResult,
    dayResult,
    insightsResult,
  ] = await Promise.all([
    client.from('mood_entries').select('date,mood,note,created_at_ms,updated_at_ms,deleted_at').eq('user_id', userId),
    client.from('habit_selections').select('date,habit_id').eq('user_id', userId),
    client.from('tracked_habits').select('habit_ids').eq('user_id', userId).maybeSingle(),
    client.from('goals').select('id,payload_json,updated_at_ms').eq('user_id', userId),
    client.from('goal_progress').select('goal_id,date,value,note,created_at_ms,updated_at_ms').eq('user_id', userId),
    client.from('app_settings').select('settings_json').eq('user_id', userId).maybeSingle(),
    client.from('tasks_records').select('payload_json').eq('user_id', userId).maybeSingle(),
    client.from('task_day_items').select('date,items_json').eq('user_id', userId),
    client.from('insights_reflection_timing').select('payload_json').eq('user_id', userId).maybeSingle(),
  ]);

  if (moodResult.error) throw moodResult.error;
  if (habitResult.error) throw habitResult.error;
  if (goalResult.error) throw goalResult.error;
  if (progressResult.error) throw progressResult.error;

  const cloudMoods = parseCloudMoods(moodResult.data as MoodRow[] | null);
  const localMoods = await applier.getLocalMoodEntries();
  await applier.applyMoodEntries(mergeMoodEntries(localMoods, cloudMoods));

  await applier.applyHabitSelections(parseHabitSelections(habitResult.data as HabitRow[] | null));

  const trackedRow = trackedResult.data as { habit_ids?: unknown } | null;
  if (trackedRow?.habit_ids && Array.isArray(trackedRow.habit_ids)) {
    const ids = trackedRow.habit_ids.filter((id): id is HabitId => typeof id === 'string' && isHabitId(id));
    await applier.applyTrackedHabitIds(ids);
  }

  const goalsById = buildGoalsRecord(
    goalResult.data as GoalRow[] | null,
    progressResult.data as ProgressRow[] | null
  );
  await applier.applyGoalsRecord({ version: 2, goalsById });

  const settingsRow = settingsResult.data as { settings_json?: unknown } | null;
  if (settingsRow?.settings_json && typeof settingsRow.settings_json === 'object') {
    await applier.applySettings(settingsRow.settings_json as AppSettings);
  }

  const tasksRow = tasksResult.data as { payload_json?: unknown } | null;
  if (tasksRow?.payload_json && typeof tasksRow.payload_json === 'object') {
    await applier.applyTasksRecord(tasksRow.payload_json as Record<string, unknown>);
  }

  for (const row of (dayResult.data ?? []) as { date: string; items_json: unknown }[]) {
    if (!isValidISODateKey(row.date)) continue;
    const items = Array.isArray(row.items_json) ? row.items_json : [];
    await applier.applyTaskDayItems(row.date, items);
  }

  const insightsRow = insightsResult.data as { payload_json?: unknown } | null;
  if (insightsRow?.payload_json && typeof insightsRow.payload_json === 'object') {
    await applier.applyInsightsTiming(insightsRow.payload_json as Record<string, unknown>);
  }

  return {
    pulledAtMs,
    moodCount: Object.keys(cloudMoods).length,
    habitRowCount: (habitResult.data as HabitRow[] | null)?.length ?? 0,
    goalCount: Object.keys(goalsById).length,
  };
}
