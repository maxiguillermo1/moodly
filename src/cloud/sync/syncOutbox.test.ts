/**
 * @fileoverview Sync outbox coalescing tests.
 */

import { enqueueSyncOperation, enqueueSyncOperationsBatch, peekOutbox, resetSyncOutboxForTests, clearOutbox } from './syncOutbox';

function getAsyncStorage(): typeof import('@react-native-async-storage/async-storage').default {
  const mod: any = require('@react-native-async-storage/async-storage');
  return mod?.default ?? mod;
}

describe('syncOutbox', () => {
  beforeEach(async () => {
    resetSyncOutboxForTests();
    await getAsyncStorage().clear();
    await clearOutbox();
  });

  it('coalesces mood upserts for the same date', async () => {
    await enqueueSyncOperation({
      kind: 'mood_upsert',
      entry: { date: '2026-05-01', mood: 'A', note: 'a', createdAt: 1, updatedAt: 1 },
    });
    await enqueueSyncOperation({
      kind: 'mood_upsert',
      entry: { date: '2026-05-01', mood: 'B', note: 'b', createdAt: 1, updatedAt: 2 },
    });
    const ops = await peekOutbox();
    const moodOps = ops.filter((o) => o.kind === 'mood_upsert');
    expect(moodOps).toHaveLength(1);
    expect(moodOps[0].kind === 'mood_upsert' && moodOps[0].entry.note).toBe('b');
  });

  it('persists a batch with one disk write', async () => {
    const storage = getAsyncStorage();
    const setItemMock = storage.setItem as jest.Mock;
    const callsBefore = setItemMock.mock.calls.length;
    await enqueueSyncOperationsBatch([
      { kind: 'mood_upsert', entry: { date: '2026-05-01', mood: 'A', note: 'a', createdAt: 1, updatedAt: 1 } },
      { kind: 'mood_upsert', entry: { date: '2026-05-02', mood: 'B', note: 'b', createdAt: 1, updatedAt: 1 } },
      { kind: 'settings_snapshot', settings: { version: 1 } as any },
    ]);
    const ops = await peekOutbox();
    expect(ops).toHaveLength(3);
    expect(setItemMock.mock.calls.length - callsBefore).toBe(1);
  });
});
