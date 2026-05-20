/**
 * @fileoverview Production wipe of all user-generated local content (store "delete my data").
 * @module data/storage/userDataReset
 *
 * Does **not** reset appearance/settings preferences (`kairo.settings`).
 */

import { assertLocalPersistenceWritable, ensureLocalPersistenceReady } from '../persistence/bootstrap';
import { clearAllEntries } from './moodStorage';
import { clearAllHabitSelections } from './habitSelectionsStorage';
import { resetTrackedHabitsToDefaults } from './habitTrackingStorage';
import { replaceAllGoalsForDev } from './goalsStorage';
import { wipeTasksStorageCompletely } from './tasksStorage';

/**
 * Removes mood entries, habit marks, tracked-habit config (defaults), goals, and reminders/tasks.
 * Safe to call from Settings; throws if persistence is not writable (e.g. disk schema ahead of app).
 */
export async function clearAllUserData(): Promise<void> {
  await ensureLocalPersistenceReady();
  assertLocalPersistenceWritable();

  await clearAllEntries();
  await clearAllHabitSelections();
  await resetTrackedHabitsToDefaults();
  await replaceAllGoalsForDev([]);
  await wipeTasksStorageCompletely();
}
