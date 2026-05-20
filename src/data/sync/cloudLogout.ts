/**
 * @fileoverview Clear local journal data on sign-out (cloud remains in Supabase).
 * @module data/sync/cloudLogout
 */

import { clearAllUserData } from '../storage/userDataReset';
import { invalidateMoodEntriesSessionCache } from '../storage/moodStorage';
import { invalidateHabitSelectionsSessionCache } from '../storage/habitSelectionsStorage';
import { invalidateGoalsSessionCache } from '../storage/goalsStorage';
import { invalidateTasksSessionCache } from '../storage/tasksStorage';

/** Removes local mood/habit/goal/reminder data after sign-out. Cloud copy is preserved. */
export async function clearLocalUserDataOnLogout(): Promise<void> {
  await clearAllUserData();
  invalidateMoodEntriesSessionCache();
  invalidateHabitSelectionsSessionCache();
  invalidateGoalsSessionCache();
  invalidateTasksSessionCache();
}
