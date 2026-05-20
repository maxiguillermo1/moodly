/**
 * @fileoverview Cloud sync status hook for UI indicators.
 * @module hooks/useCloudSyncStatus
 */

import { useEffect, useState } from 'react';
import type { SyncStatus } from '../cloud/sync/types';
import { getSyncStatus, subscribeSyncStatus } from '../cloud/sync/syncStatusStore';

export function useCloudSyncStatus(): { status: SyncStatus; detail?: string } {
  const [state, setState] = useState(getSyncStatus);

  useEffect(() => subscribeSyncStatus((status, detail) => setState({ status, detail })), []);

  return state;
}

export type { SyncStatus };
