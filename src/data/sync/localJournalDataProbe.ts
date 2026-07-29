/**
 * @fileoverview Detect whether the device has journal data worth uploading to cloud.
 * @module data/sync/localJournalDataProbe
 */

import { getAllEntries } from '../storage/moodStorage';
import { getHabitSelectionsRecordSnapshot } from '../storage/habitSelectionsStorage';
import { getGoals } from '../storage/goalsStorage';
import { getTaskDayIndexSnapshot } from '../storage/tasksStorage';

/** True when local device has mood, habits, goals, or reminder data to snapshot. */
export async function deviceHasLocalJournalData(): Promise<boolean> {
  const [entries, goals, habitSelections, taskDayIndex] = await Promise.all([
    getAllEntries(),
    getGoals(),
    getHabitSelectionsRecordSnapshot(),
    getTaskDayIndexSnapshot(),
  ]);

  if (Object.keys(entries).length > 0) return true;
  if (goals.length > 0) return true;
  if (Object.keys(habitSelections).length > 0) return true;
  if (taskDayIndex.length > 0) return true;
  return false;
}
