/**
 * @fileoverview Human-readable cloud sync status labels for Account UI.
 * @module features/account/syncStatusLabel
 */
export function syncStatusLabel(status, detail) {
    switch (status) {
        case 'syncing':
            return 'Syncing…';
        case 'saved':
            return 'Saved to cloud';
        case 'offline':
            return detail ?? 'Offline — changes will sync when online';
        case 'error':
            return detail ?? 'Sync error';
        default:
            return 'Up to date';
    }
}
