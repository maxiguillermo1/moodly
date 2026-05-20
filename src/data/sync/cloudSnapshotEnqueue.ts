/**
 * @fileoverview Enqueue full local snapshots for first cloud upload after sign-in.
 * @module data/sync/cloudSnapshotEnqueue
 */

import { getAllEntries } from '../storage/moodStorage';
import { getHabitSelectionsRecordSnapshot } from '../storage/habitSelectionsStorage';
import { getTrackedHabitIds } from '../storage/habitTrackingStorage';
import { getGoals } from '../storage/goalsStorage';
import { getSettings } from '../storage/settingsStorage';
import { getTasksRecordSnapshot } from '../storage/tasksStorage';
import { insightsReflectionStateStorage } from '../storage/insightsReflectionStateStorage';
import { enqueueSyncOperation } from '../../cloud/sync/syncOutbox';
import { isSupabaseConfigured } from '../../cloud/supabase/client';

/** Push all local domains to outbox so first sync uploads device history to cloud. */
export async function enqueueFullLocalSnapshotForCloud(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const [entries, habitSelections, trackedIds, goals, settings, tasksRecord, insights] = await Promise.all([
    getAllEntries(),
    getHabitSelectionsRecordSnapshot(),
    getTrackedHabitIds(),
    getGoals(),
    getSettings(),
    getTasksRecordSnapshot(),
    insightsReflectionStateStorage.getTimingState(),
  ]);

  const goalsById = Object.fromEntries(goals.map((g) => [g.id, g]));

  await enqueueSyncOperation({ kind: 'settings_snapshot', settings });
  await enqueueSyncOperation({ kind: 'habits_snapshot', selections: habitSelections });
  await enqueueSyncOperation({ kind: 'tracked_habits_snapshot', habitIds: trackedIds });
  await enqueueSyncOperation({ kind: 'goals_snapshot', record: { version: 2, goalsById } });
  await enqueueSyncOperation({ kind: 'tasks_snapshot', record: tasksRecord });
  await enqueueSyncOperation({ kind: 'insights_timing_snapshot', payload: insights as Record<string, unknown> });

  for (const entry of Object.values(entries)) {
    if (entry) await enqueueSyncOperation({ kind: 'mood_upsert', entry });
  }
}
