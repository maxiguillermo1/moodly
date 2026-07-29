/**
 * @fileoverview Full local user-data wipe + session cache invalidation (fresh device state).
 * @module data/sync/localUserDataReset
 */

import { clearOutbox } from '../../cloud/sync/syncOutbox';
import { clearAllUserData } from '../storage/userDataReset';
import { invalidateMoodEntriesSessionCache } from '../storage/moodStorage';
import { invalidateHabitSelectionsSessionCache } from '../storage/habitSelectionsStorage';
import { invalidateGoalsSessionCache } from '../storage/goalsStorage';
import { invalidateTasksSessionCache } from '../storage/tasksStorage';
import { insightsReflectionStateStorage } from '../storage/insightsReflectionStateStorage';

/** Clears all user domains, insight timing, sync outbox, and in-memory storage caches. */
export async function resetLocalUserDataCompletely(): Promise<void> {
  await clearAllUserData();
  await insightsReflectionStateStorage.clearAll();
  await clearOutbox();
  invalidateMoodEntriesSessionCache();
  invalidateHabitSelectionsSessionCache();
  invalidateGoalsSessionCache();
  invalidateTasksSessionCache();
}
