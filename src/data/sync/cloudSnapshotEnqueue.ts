/**
 * @fileoverview Enqueue full local snapshots for first cloud upload after sign-in.
 * @module data/sync/cloudSnapshotEnqueue
 */

import { getAllEntries } from '../storage/moodStorage';
import { getHabitSelectionsRecordSnapshot } from '../storage/habitSelectionsStorage';
import { getTrackedHabitIds } from '../storage/habitTrackingStorage';
import { getGoals } from '../storage/goalsStorage';
import { getSettings } from '../storage/settingsStorage';
import { getTasksRecordSnapshot, getTaskDayIndexSnapshot, getTasksForDate } from '../storage/tasksStorage';
import { insightsReflectionStateStorage } from '../storage/insightsReflectionStateStorage';
import { enqueueSyncOperationsBatch } from '../../cloud/sync/syncOutbox';
import { isSupabaseConfigured } from '../../cloud/supabase/client';
import type { SyncOperationInput } from '../../cloud/sync/types';

/** Push all local domains to outbox so first sync uploads device history to cloud. */
export async function enqueueFullLocalSnapshotForCloud(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const [entries, habitSelections, trackedIds, goals, settings, tasksRecord, insights, dayIndex] =
    await Promise.all([
      getAllEntries(),
      getHabitSelectionsRecordSnapshot(),
      getTrackedHabitIds(),
      getGoals(),
      getSettings(),
      getTasksRecordSnapshot(),
      insightsReflectionStateStorage.getTimingState(),
      getTaskDayIndexSnapshot(),
    ]);

  const goalsById = Object.fromEntries(goals.map((g) => [g.id, g]));
  const ops: SyncOperationInput[] = [
    { kind: 'settings_snapshot', settings },
    { kind: 'habits_snapshot', selections: habitSelections },
    { kind: 'tracked_habits_snapshot', habitIds: trackedIds },
    { kind: 'goals_snapshot', record: { version: 2, goalsById } },
    { kind: 'tasks_snapshot', record: tasksRecord },
    { kind: 'insights_timing_snapshot', payload: insights as Record<string, unknown> },
  ];

  const taskDaySnapshots = await Promise.all(
    dayIndex.map(async (date) => ({
      kind: 'task_day_snapshot' as const,
      date,
      items: await getTasksForDate(date),
    }))
  );
  ops.push(...taskDaySnapshots);

  for (const entry of Object.values(entries)) {
    if (entry) ops.push({ kind: 'mood_upsert', entry });
  }

  await enqueueSyncOperationsBatch(ops);
}
