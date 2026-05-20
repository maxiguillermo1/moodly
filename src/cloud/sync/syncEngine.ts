/**
 * @fileoverview Cloud sync orchestrator — pull, push outbox, retry, status.
 * @module cloud/sync/syncEngine
 */

import type { Session, User } from '@supabase/supabase-js';
import { logger } from '../../lib/security/logger';
import { isSupabaseConfigured } from '../supabase/client';
import { pullCloudDataToLocal, type CloudPullApplier } from './cloudPull';
import { pushOutboxToCloud } from './cloudPush';
import { clearOutbox } from './syncOutbox';
import { setSyncStatus } from './syncStatusStore';

let cloudPullActive = false;
let syncInFlight: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let applier: CloudPullApplier | null = null;

const RETRY_MS = 15_000;

export function isCloudPullActive(): boolean {
  return cloudPullActive;
}

export function registerCloudPullApplier(next: CloudPullApplier): void {
  applier = next;
}

async function runWithPullGuard<T>(fn: () => Promise<T>): Promise<T> {
  cloudPullActive = true;
  try {
    return await fn();
  } finally {
    cloudPullActive = false;
  }
}

function scheduleRetry(): void {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void runSyncCycle(null);
  }, RETRY_MS);
}

export async function runSyncCycle(session: Session | null): Promise<void> {
  if (!isSupabaseConfigured() || !session?.user || !applier) {
    setSyncStatus('idle');
    return;
  }
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    setSyncStatus('syncing');
    try {
      await runWithPullGuard(async () => {
        await pullCloudDataToLocal(session.user, applier!);
      });

      const { remaining } = await pushOutboxToCloud(session.user);
      if (remaining > 0) {
        setSyncStatus('offline', 'Some changes will sync when connection improves.');
        scheduleRetry();
      } else {
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2000);
      }

      logger.perf('cloud.sync.completed', {
        phase: 'warm',
        source: 'network',
        remaining,
      });
    } catch (e) {
      logger.warn('cloud.sync.failed', { error: e });
      setSyncStatus('offline');
      scheduleRetry();
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

/** Full cloud restore after sign-in or reinstall — cloud wins, then push any newer local outbox. */
export async function runInitialCloudRestore(user: User): Promise<void> {
  if (!applier) return;
  setSyncStatus('syncing');
  await runWithPullGuard(async () => {
    await pullCloudDataToLocal(user, applier!);
  });
  await pushOutboxToCloud(user);
  setSyncStatus('saved');
  setTimeout(() => setSyncStatus('idle'), 2000);
}

export async function onUserSignedOut(): Promise<void> {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  await clearOutbox();
  setSyncStatus('idle');
}

/** @internal Jest */
export function resetSyncEngineForTests(): void {
  cloudPullActive = false;
  syncInFlight = null;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}
