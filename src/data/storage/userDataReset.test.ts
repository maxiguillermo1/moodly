import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetPersistenceBootstrapForTests } from '../persistence/bootstrap';
import { upsertEntry, createEntry, getAllEntries } from './moodStorage';
import { upsertGoal } from './goalsStorage';
import { addTaskForDate } from './tasksStorage';
import { toggleHabitForDate } from './habitSelectionsStorage';
import { clearAllUserData } from './userDataReset';

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
