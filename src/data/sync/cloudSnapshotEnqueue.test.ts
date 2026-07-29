/**
 * @fileoverview cloudSnapshotEnqueue batching tests.
 */

import { enqueueFullLocalSnapshotForCloud } from './cloudSnapshotEnqueue';
import { peekOutbox, resetSyncOutboxForTests, clearOutbox } from '../../cloud/sync/syncOutbox';

jest.mock('../../cloud/supabase/client', () => ({
  isSupabaseConfigured: () => true,
}));

jest.mock('../storage/moodStorage', () => ({
  getAllEntries: jest.fn(async () => ({
    '2026-05-01': { date: '2026-05-01', mood: 'A', note: '', createdAt: 1, updatedAt: 1 },
    '2026-05-02': { date: '2026-05-02', mood: 'B', note: '', createdAt: 1, updatedAt: 1 },
  })),
}));

jest.mock('../storage/habitSelectionsStorage', () => ({
  getHabitSelectionsRecordSnapshot: jest.fn(async () => ({})),
}));

jest.mock('../storage/habitTrackingStorage', () => ({
  getTrackedHabitIds: jest.fn(async () => []),
}));

jest.mock('../storage/goalsStorage', () => ({
  getGoals: jest.fn(async () => []),
}));

jest.mock('../storage/settingsStorage', () => ({
  getSettings: jest.fn(async () => ({ version: 1 })),
}));

jest.mock('../storage/tasksStorage', () => ({
  getTasksRecordSnapshot: jest.fn(async () => ({ version: 1, tasksById: {} })),
  getTaskDayIndexSnapshot: jest.fn(async () => ['2026-05-01']),
  getTasksForDate: jest.fn(async () => []),
}));

jest.mock('../storage/insightsReflectionStateStorage', () => ({
  insightsReflectionStateStorage: {
    getTimingState: jest.fn(async () => ({})),
  },
}));

function getAsyncStorage(): typeof import('@react-native-async-storage/async-storage').default {
  const mod: any = require('@react-native-async-storage/async-storage');
  return mod?.default ?? mod;
}

describe('cloudSnapshotEnqueue', () => {
  beforeEach(async () => {
    resetSyncOutboxForTests();
    await getAsyncStorage().clear();
    await clearOutbox();
  });

  it('enqueues full snapshot in one outbox persist', async () => {
    const storage = getAsyncStorage();
    const setItemMock = storage.setItem as jest.Mock;
    const callsBefore = setItemMock.mock.calls.length;

    await enqueueFullLocalSnapshotForCloud();

    const ops = await peekOutbox();
    expect(ops.length).toBeGreaterThan(0);
    expect(setItemMock.mock.calls.length - callsBefore).toBe(1);
  });
});
