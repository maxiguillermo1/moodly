/**
 * @fileoverview In-memory + persisted sync status for UI.
 * @module cloud/sync/syncStatusStore
 */

import type { SyncStatus } from './types';

type Listener = (status: SyncStatus, detail?: string) => void;

let status: SyncStatus = 'idle';
let detail: string | undefined;
const listeners = new Set<Listener>();

export function getSyncStatus(): { status: SyncStatus; detail?: string } {
  return { status, detail };
}

export function setSyncStatus(next: SyncStatus, nextDetail?: string): void {
  status = next;
  detail = nextDetail;
  for (const l of listeners) l(status, detail);
}

export function subscribeSyncStatus(listener: Listener): () => void {
  listeners.add(listener);
  listener(status, detail);
  return () => listeners.delete(listener);
}

/** @internal Jest */
export function resetSyncStatusForTests(): void {
  status = 'idle';
  detail = undefined;
  listeners.clear();
}
