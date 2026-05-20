/**
 * @fileoverview Registers cloud pull appliers that delegate to local storage modules.
 * @module data/sync/cloudPullApplier
 */

import { getAllEntries, setAllEntries } from '../storage/moodStorage';
import { setAllHabitSelectionsRecord } from '../storage/habitSelectionsStorage';
import { setTrackedHabitIds } from '../storage/habitTrackingStorage';
import { replaceAllGoalsForDev } from '../storage/goalsStorage';
import { setSettings } from '../storage/settingsStorage';
import { replaceTasksRecordForSync, replaceTaskDayShardForSync } from '../storage/tasksStorage';
import { replaceInsightsReflectionTimingForSync } from '../storage/insightsReflectionStateStorage';
import type { CloudPullApplier } from '../../cloud/sync/cloudPull';
import type { GoalsRecord } from '../../types/goals.types';
import type { TasksRecord } from '../../types/todo.types';
import type { DayTodoItem } from '../../types/todo.types';

export const kairoCloudPullApplier: CloudPullApplier = {
  getLocalMoodEntries: getAllEntries,
  applyMoodEntries: setAllEntries,
  applyHabitSelections: async (selections) => {
    await setAllHabitSelectionsRecord(selections);
  },
  applyTrackedHabitIds: setTrackedHabitIds,
  applyGoalsRecord: async (record: GoalsRecord) => {
    await replaceAllGoalsForDev(Object.values(record.goalsById ?? {}));
  },
  applySettings: setSettings,
  applyTasksRecord: async (record) => {
    await replaceTasksRecordForSync(record as TasksRecord);
  },
  applyTaskDayItems: async (date: string, items: unknown[]) => {
    await replaceTaskDayShardForSync(date, items as DayTodoItem[]);
  },
  applyInsightsTiming: replaceInsightsReflectionTimingForSync,
};

export async function registerKairoCloudPullApplier(): Promise<void> {
  const { registerCloudPullApplier } = await import('../../cloud/sync/syncEngine');
  registerCloudPullApplier(kairoCloudPullApplier);
}
