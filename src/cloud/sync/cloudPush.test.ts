/**
 * @fileoverview cloudPush integration tests (destructive snapshots + outbox drain).
 */

import { pushOutboxToCloud } from './cloudPush';
import { enqueueSyncOperationsBatch, peekOutbox, resetSyncOutboxForTests, clearOutbox } from './syncOutbox';

const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockInsert = jest.fn();
const mockUpsert = jest.fn();

mockDelete.mockReturnValue({ eq: mockEq });
mockEq.mockResolvedValue({ error: null });
mockInsert.mockResolvedValue({ error: null });
mockUpsert.mockResolvedValue({ error: null });

const mockFrom = jest.fn((table: string) => {
  if (table === 'habit_selections') {
    return { delete: mockDelete, insert: mockInsert };
  }
  if (table === 'goals' || table === 'goal_progress') {
    return { delete: mockDelete, insert: mockInsert };
  }
  return { upsert: mockUpsert };
});

jest.mock('../supabase/client', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

function getAsyncStorage(): typeof import('@react-native-async-storage/async-storage').default {
  const mod: any = require('@react-native-async-storage/async-storage');
  return mod?.default ?? mod;
}

describe('pushOutboxToCloud', () => {
  beforeEach(async () => {
    resetSyncOutboxForTests();
    await getAsyncStorage().clear();
    await clearOutbox();
    jest.clearAllMocks();
    mockEq.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it('habits_snapshot delete-all then insert (destructive domain sync)', async () => {
    await enqueueSyncOperationsBatch([
      {
        kind: 'habits_snapshot',
        selections: { '2026-05-01': ['workout'] },
      },
    ]);

    const result = await pushOutboxToCloud({ id: 'user-1' } as never);

    expect(result.pushed).toBe(1);
    expect(result.remaining).toBe(0);
    expect(mockFrom).toHaveBeenCalledWith('habit_selections');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockInsert).toHaveBeenCalled();
    expect(await peekOutbox()).toHaveLength(0);
  });

  it('goals_snapshot delete-all goals and progress before insert', async () => {
    await enqueueSyncOperationsBatch([
      {
        kind: 'goals_snapshot',
        record: {
          version: 2,
          goalsById: {
            g1: {
              id: 'g1',
              title: 'Run',
              createdAt: 1,
              updatedAt: 2,
              history: [],
            },
          },
        },
      } as never,
    ]);

    await pushOutboxToCloud({ id: 'user-1' } as never);

    expect(mockFrom).toHaveBeenCalledWith('goal_progress');
    expect(mockFrom).toHaveBeenCalledWith('goals');
    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(mockInsert).toHaveBeenCalled();
  });

  it('empty goals_snapshot deletes remote goals without insert', async () => {
    await enqueueSyncOperationsBatch([
      {
        kind: 'goals_snapshot',
        record: { version: 2, goalsById: {} },
      },
    ]);

    await pushOutboxToCloud({ id: 'user-1' } as never);

    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('mood_upsert uses upsert only (non-destructive)', async () => {
    await enqueueSyncOperationsBatch([
      {
        kind: 'mood_upsert',
        entry: { date: '2026-05-01', mood: 'A', note: '', createdAt: 1, updatedAt: 1 },
      },
    ]);

    await pushOutboxToCloud({ id: 'user-1' } as never);

    expect(mockUpsert).toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('retains failed ops in outbox', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'network down' } });
    await enqueueSyncOperationsBatch([
      {
        kind: 'mood_upsert',
        entry: { date: '2026-05-01', mood: 'A', note: '', createdAt: 1, updatedAt: 1 },
      },
    ]);

    const result = await pushOutboxToCloud({ id: 'user-1' } as never);

    expect(result.pushed).toBe(0);
    expect(result.remaining).toBe(1);
    expect(await peekOutbox()).toHaveLength(1);
  });
});
