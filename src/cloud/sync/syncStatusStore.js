/**
 * @fileoverview In-memory + persisted sync status for UI.
 * @module cloud/sync/syncStatusStore
 */
let status = 'idle';
let detail;
const listeners = new Set();
export function getSyncStatus() {
    return { status, detail };
}
export function setSyncStatus(next, nextDetail) {
    status = next;
    detail = nextDetail;
    for (const l of listeners)
        l(status, detail);
}
export function subscribeSyncStatus(listener) {
    listeners.add(listener);
    listener(status, detail);
    return () => listeners.delete(listener);
}
/** @internal Jest */
export function resetSyncStatusForTests() {
    status = 'idle';
    detail = undefined;
    listeners.clear();
}
