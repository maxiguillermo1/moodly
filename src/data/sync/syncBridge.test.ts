/**
 * @fileoverview syncBridge integration tests — pull guard + debounced sync.
 */

import { notifyMoodEntryUpserted, resetSyncBridgeForTests } from './syncBridge';
import { isCloudPullActive, runSyncCycle } from '../../cloud/sync/syncEngine';
import { enqueueSyncOperation } from '../../cloud/sync/syncOutbox';
import { restoreAuthSession } from '../../cloud/auth/authService';
import {
  resetAuthSessionCacheForTests,
  setCachedAuthSession,
} from '../../cloud/auth/authSessionCache';
import { isSupabaseConfigured } from '../../cloud/supabase/client';

jest.mock('../../cloud/sync/syncEngine', () => ({
  isCloudPullActive: jest.fn(),
  runSyncCycle: jest.fn(async () => undefined),
}));

jest.mock('../../cloud/sync/syncOutbox', () => ({
  enqueueSyncOperation: jest.fn(async () => undefined),
}));

jest.mock('../../cloud/auth/authService', () => ({
  restoreAuthSession: jest.fn(),
}));

jest.mock('../../cloud/supabase/client', () => ({
  isSupabaseConfigured: jest.fn(() => true),
}));

const sampleEntry = {
  date: '2026-05-01',
  mood: 'A' as const,
  note: '',
  createdAt: 1,
  updatedAt: 1,
};

describe('syncBridge', () => {
  beforeEach(() => {
    resetSyncBridgeForTests();
    resetAuthSessionCacheForTests();
    jest.clearAllMocks();
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    (isCloudPullActive as jest.Mock).mockReturnValue(false);
    (restoreAuthSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('skips enqueue and sync trigger while cloud pull is active', () => {
    (isCloudPullActive as jest.Mock).mockReturnValue(true);

    notifyMoodEntryUpserted(sampleEntry);

    expect(enqueueSyncOperation).not.toHaveBeenCalled();
    expect(restoreAuthSession).not.toHaveBeenCalled();
  });

  it('enqueues mood upsert and debounces runSyncCycle when pull is inactive', async () => {
    jest.useFakeTimers();

    notifyMoodEntryUpserted(sampleEntry);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(enqueueSyncOperation).toHaveBeenCalledWith({ kind: 'mood_upsert', entry: sampleEntry });
    expect(runSyncCycle).not.toHaveBeenCalled();

    jest.advanceTimersByTime(400);
    await Promise.resolve();

    expect(restoreAuthSession).toHaveBeenCalledTimes(1);
    expect(runSyncCycle).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('uses cached session without SecureStore read on debounced sync', async () => {
    jest.useFakeTimers();
    setCachedAuthSession({ user: { id: 'user-cached' } } as never);

    notifyMoodEntryUpserted(sampleEntry);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    jest.advanceTimersByTime(400);
    await Promise.resolve();

    expect(restoreAuthSession).not.toHaveBeenCalled();
    expect(runSyncCycle).toHaveBeenCalledWith({ user: { id: 'user-cached' } });

    jest.useRealTimers();
  });

  it('skips entirely when Supabase is not configured', () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);

    notifyMoodEntryUpserted(sampleEntry);

    expect(enqueueSyncOperation).not.toHaveBeenCalled();
  });
});
