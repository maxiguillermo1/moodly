/**
 * @fileoverview Cloud sync status hook for UI indicators.
 * @module hooks/useCloudSyncStatus
 */
import { useEffect, useState } from 'react';
import { getSyncStatus, subscribeSyncStatus } from '../cloud/sync/syncStatusStore';
export function useCloudSyncStatus() {
    const [state, setState] = useState(getSyncStatus);
    useEffect(() => subscribeSyncStatus((status, detail) => setState({ status, detail })), []);
    return state;
}
