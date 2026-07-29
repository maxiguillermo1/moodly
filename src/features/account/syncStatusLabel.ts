/**
 * @fileoverview Human-readable cloud sync status labels for Account UI.
 * @module features/account/syncStatusLabel
 */

import type { SyncStatus } from '@/hooks/useCloudSyncStatus';

export function syncStatusLabel(status: SyncStatus, detail?: string): string {
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
