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
export const kairoCloudPullApplier = {
    getLocalMoodEntries: getAllEntries,
    applyMoodEntries: setAllEntries,
    applyHabitSelections: async (selections) => {
        await setAllHabitSelectionsRecord(selections);
    },
    applyTrackedHabitIds: setTrackedHabitIds,
    applyGoalsRecord: async (record) => {
        await replaceAllGoalsForDev(Object.values(record.goalsById ?? {}));
    },
    applySettings: setSettings,
    applyTasksRecord: async (record) => {
        await replaceTasksRecordForSync(record);
    },
    applyTaskDayItems: async (date, items) => {
        await replaceTaskDayShardForSync(date, items);
    },
    applyInsightsTiming: replaceInsightsReflectionTimingForSync,
};
export async function registerKairoCloudPullApplier() {
    const { registerCloudPullApplier } = await import('../../cloud/sync/syncEngine');
    registerCloudPullApplier(kairoCloudPullApplier);
}
