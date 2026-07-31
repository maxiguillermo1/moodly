/**
 * @fileoverview Bridge from local storage writes to cloud sync outbox.
 * @module data/sync/syncBridge
 *
 * Storage modules call these helpers after successful local persistence.
 * Skipped during cloud pull to avoid feedback loops.
 */
import { isCloudPullActive, runSyncCycle } from '../../cloud/sync/syncEngine';
import { enqueueSyncOperation } from '../../cloud/sync/syncOutbox';
import { restoreAuthSession } from '../../cloud/auth/authService';
import { getCachedAuthSession, setCachedAuthSession } from '../../cloud/auth/authSessionCache';
import { isSupabaseConfigured } from '../../cloud/supabase/client';
let debounceTimer = null;
function skipSync() {
    return !isSupabaseConfigured() || isCloudPullActive();
}
async function resolveAuthSession() {
    const cached = getCachedAuthSession();
    if (cached)
        return cached;
    const session = await restoreAuthSession();
    if (session)
        setCachedAuthSession(session);
    return session;
}
async function triggerSyncSoon() {
    if (skipSync())
        return;
    const session = await resolveAuthSession();
    if (!session)
        return;
    if (debounceTimer)
        clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void runSyncCycle(session);
    }, 400);
}
export function notifyMoodEntryUpserted(entry) {
    if (skipSync())
        return;
    void enqueueSyncOperation({ kind: 'mood_upsert', entry }).then(() => triggerSyncSoon());
}
export function notifyMoodEntryDeleted(date) {
    if (skipSync())
        return;
    void enqueueSyncOperation({ kind: 'mood_delete', date }).then(() => triggerSyncSoon());
}
export function notifyHabitSelectionsChanged(selections) {
    if (skipSync())
        return;
    void enqueueSyncOperation({ kind: 'habits_snapshot', selections }).then(() => triggerSyncSoon());
}
export function notifyTrackedHabitsChanged(habitIds) {
    if (skipSync())
        return;
    void enqueueSyncOperation({ kind: 'tracked_habits_snapshot', habitIds }).then(() => triggerSyncSoon());
}
export function notifyGoalsChanged(record) {
    if (skipSync())
        return;
    void enqueueSyncOperation({ kind: 'goals_snapshot', record }).then(() => triggerSyncSoon());
}
export function notifySettingsChanged(settings) {
    if (skipSync())
        return;
    void enqueueSyncOperation({ kind: 'settings_snapshot', settings }).then(() => triggerSyncSoon());
}
export function notifyTasksRecordChanged(record) {
    if (skipSync())
        return;
    void enqueueSyncOperation({ kind: 'tasks_snapshot', record }).then(() => triggerSyncSoon());
}
export function notifyTaskDayChanged(date, items) {
    if (skipSync())
        return;
    void enqueueSyncOperation({ kind: 'task_day_snapshot', date, items }).then(() => triggerSyncSoon());
}
export function notifyInsightsTimingChanged(payload) {
    if (skipSync())
        return;
    void enqueueSyncOperation({ kind: 'insights_timing_snapshot', payload }).then(() => triggerSyncSoon());
}
/** @internal Jest */
export function resetSyncBridgeForTests() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
}
