/**
 * @fileoverview Full local reset tests (fresh account state).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetPersistenceBootstrapForTests } from '../persistence/bootstrap';
import { upsertEntry, createEntry, getAllEntries } from './moodStorage';
import { upsertGoal } from './goalsStorage';
import { addTaskForDate } from './tasksStorage';
import { toggleHabitForDate } from './habitSelectionsStorage';
import { clearAllUserData } from './userDataReset';
import { resetLocalUserDataCompletely } from '../sync/localUserDataReset';
import { insightsReflectionStateStorage } from './insightsReflectionStateStorage';
import { enqueueSyncOperation, peekOutbox } from '../../cloud/sync/syncOutbox';

describe('clearAllUserData', () => {
  beforeEach(async () => {
    (globalThis as any).__KAIRO_CHAOS__ = undefined;
    resetPersistenceBootstrapForTests();
    await AsyncStorage.clear();
  });

  it('wipes mood entries, goals, tasks, and habit selections', async () => {
    await upsertEntry(createEntry('2026-05-01', 'A', 'note'));
    await upsertGoal({ title: 'Run', type: 'habit' });
    await addTaskForDate('2026-05-01', 'Stretch');
    await toggleHabitForDate('2026-05-01', 'workout');

    await clearAllUserData();

    expect(Object.keys(await getAllEntries())).toHaveLength(0);
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    expect(await goals.getGoals()).toHaveLength(0);
    const tasks = require('./tasksStorage') as typeof import('./tasksStorage');
    expect(await tasks.getTasksForDate('2026-05-01')).toHaveLength(0);
    const habits = require('./habitSelectionsStorage') as typeof import('./habitSelectionsStorage');
    expect(await habits.getHabitSelectionsForDate('2026-05-01')).toEqual([]);
  });
});

describe('resetLocalUserDataCompletely', () => {
  beforeEach(async () => {
    (globalThis as any).__KAIRO_CHAOS__ = undefined;
    resetPersistenceBootstrapForTests();
    await AsyncStorage.clear();
  });

  it('also clears insight timing and sync outbox', async () => {
    await upsertEntry(createEntry('2026-05-01', 'A', 'note'));
    await insightsReflectionStateStorage.recordTopicsSurfaced(['topic-a'], 1000);
    await enqueueSyncOperation({
      kind: 'habits_snapshot',
      selections: {},
    });

    await resetLocalUserDataCompletely();

    expect(Object.keys(await getAllEntries())).toHaveLength(0);
    const timing = await insightsReflectionStateStorage.getTimingState();
    expect(timing.topicLastSurfacedAtMs).toEqual({});
    expect(await peekOutbox()).toEqual([]);
  });
});
