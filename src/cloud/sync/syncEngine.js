/**
 * @fileoverview Cloud sync orchestrator — pull, push outbox, retry, status.
 * @module cloud/sync/syncEngine
 */
import { logger } from '../../lib/security/logger';
import { restoreAuthSession } from '../auth/authService';
import { getCachedAuthSession } from '../auth/authSessionCache';
import { isSupabaseConfigured } from '../supabase/client';
import { pullCloudDataToLocal } from './cloudPull';
import { pushOutboxToCloud } from './cloudPush';
import { reconcileOutboxAfterPull } from './outboxReconcile';
import { clearOutbox } from './syncOutbox';
import { setSyncStatus } from './syncStatusStore';
let cloudPullActive = false;
let syncInFlight = null;
let retryTimer = null;
let applier = null;
const RETRY_MS = 15000;
export function isCloudPullActive() {
    return cloudPullActive;
}
export function registerCloudPullApplier(next) {
    applier = next;
}
async function runWithPullGuard(fn) {
    cloudPullActive = true;
    try {
        return await fn();
    }
    finally {
        cloudPullActive = false;
    }
}
function scheduleRetry() {
    if (retryTimer)
        return;
    retryTimer = setTimeout(() => {
        retryTimer = null;
        const cached = getCachedAuthSession();
        if (cached) {
            void runSyncCycle(cached);
            return;
        }
        void restoreAuthSession().then((session) => runSyncCycle(session));
    }, RETRY_MS);
}
export async function runSyncCycle(session) {
    if (!isSupabaseConfigured() || !session?.user || !applier) {
        setSyncStatus('idle');
        return;
    }
    if (syncInFlight)
        return syncInFlight;
    syncInFlight = (async () => {
        setSyncStatus('syncing');
        try {
            await runWithPullGuard(async () => {
                await pullCloudDataToLocal(session.user, applier);
                await reconcileOutboxAfterPull(applier);
            });
            const { remaining } = await pushOutboxToCloud(session.user);
            if (remaining > 0) {
                setSyncStatus('offline', 'Some changes will sync when connection improves.');
                scheduleRetry();
            }
            else {
                setSyncStatus('saved');
                setTimeout(() => setSyncStatus('idle'), 2000);
            }
            logger.perf('cloud.sync.completed', {
                phase: 'warm',
                source: 'network',
                remaining,
            });
        }
        catch (e) {
            logger.warn('cloud.sync.failed', { error: e });
            setSyncStatus('offline');
            scheduleRetry();
        }
        finally {
            syncInFlight = null;
        }
    })();
    return syncInFlight;
}
/** Full cloud restore after sign-in or reinstall — cloud wins, then push any newer local outbox. */
export async function runInitialCloudRestore(user) {
    if (!applier)
        return;
    setSyncStatus('syncing');
    await runWithPullGuard(async () => {
        await pullCloudDataToLocal(user, applier);
        await reconcileOutboxAfterPull(applier);
    });
    await pushOutboxToCloud(user);
    setSyncStatus('saved');
    setTimeout(() => setSyncStatus('idle'), 2000);
}
export async function onUserSignedOut() {
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }
    await clearOutbox();
    setSyncStatus('idle');
}
/** @internal Jest */
export function resetSyncEngineForTests() {
    cloudPullActive = false;
    syncInFlight = null;
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }
}
