/**
 * @fileoverview Clears in-memory storage caches after a full import restore.
 * @module data/persistence/localExport/importSessionReset
 */
import { invalidateGoalsSessionCache } from '../../storage/goalsStorage';
import { invalidateHabitSelectionsSessionCache } from '../../storage/habitSelectionsStorage';
import { invalidateMoodEntriesSessionCache } from '../../storage/moodStorage';
import { invalidateSettingsSessionCache } from '../../storage/settingsStorage';
import { invalidateTasksSessionCache } from '../../storage/tasksStorage';
export function invalidateAllStorageSessionCachesAfterImport() {
    invalidateMoodEntriesSessionCache();
    invalidateHabitSelectionsSessionCache();
    invalidateGoalsSessionCache();
    invalidateSettingsSessionCache();
    invalidateTasksSessionCache();
}
