const TASKS_KEY = 'kairo.tasks';
const LEGACY_KEY = 'kairo.dayTodos';
const DAY_INDEX_KEY = 'kairo.tasks.dayIndex';
const dayShardKey = (date: string) => `kairo.tasks.day.${date}`;

describe('tasksStorage foundation', () => {
  beforeEach(async () => {
    (globalThis as any).__KAIRO_CHAOS__ = undefined;
    jest.resetModules();
    const mod: any = require('@react-native-async-storage/async-storage');
    await (mod?.default ?? mod).clear();
  });

  it('migrates legacy day todos once and preserves day API behavior', async () => {
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({
        '2026-09-01': [
          { id: 'legacy-a', title: 'legacy task', done: false, createdAt: 1, sortIndex: 0, reminderMinutes: 540 },
        ],
      })
    );

    const tasks = require('./tasksStorage') as typeof import('./tasksStorage');
    expect(await tasks.getTasksForDate('2026-09-01')).toEqual([
      { id: 'dayTodo:2026-09-01:legacy-a', title: 'legacy task', done: false, createdAt: 1, sortIndex: 0, reminderMinutes: 540 },
    ]);

    const raw = JSON.parse((await AsyncStorage.getItem(TASKS_KEY))!);
    expect(raw.migratedLegacyDayTodosAt).toEqual(expect.any(Number));
    await tasks.addTaskForDate('2026-09-01', 'new task');
    const dayShard = JSON.parse((await AsyncStorage.getItem(dayShardKey('2026-09-01')))!);
    expect(dayShard).toHaveLength(2);
    expect(JSON.parse((await AsyncStorage.getItem(DAY_INDEX_KEY))!)).toContain('2026-09-01');
  });

  it('does not drop legacy rows when different days reuse the same item id', async () => {
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({
        '2026-09-01': [{ id: 'same', title: 'first day', done: false, createdAt: 1, sortIndex: 0 }],
        '2026-09-02': [{ id: 'same', title: 'second day', done: false, createdAt: 2, sortIndex: 0 }],
      })
    );
    const tasks = require('./tasksStorage') as typeof import('./tasksStorage');
    expect((await tasks.getTasksForDate('2026-09-01'))[0]?.title).toBe('first day');
    expect((await tasks.getTasksForDate('2026-09-02'))[0]?.title).toBe('second day');
  });

  it('round-trips recurrence, subtasks, lists, tags, and history on cold load', async () => {
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.setItem(
      TASKS_KEY,
      JSON.stringify({
        version: 1,
        tasksById: {
          t1: {
            id: 't1',
            title: 'rich task',
            notes: 'note',
            status: 'open',
            priority: 'high',
            listId: 'l1',
            tagIds: ['tag1'],
            subtasks: [{ id: 's1', title: 'sub', done: false, createdAt: 1, completedAt: null, sortIndex: 0 }],
            reminders: [],
            recurrence: {
              id: 'r1',
              frequency: 'weekly',
              interval: 1,
              startDate: '2026-05-11',
              endDate: null,
              weekdays: [1, 3],
              lastGeneratedDate: null,
            },
            dueDate: '2026-05-11',
            sortIndex: 0,
            createdAt: 1,
            updatedAt: 1,
            completedAt: null,
            archivedAt: null,
            source: 'task',
          },
        },
        listsById: { l1: { id: 'l1', title: 'List', color: null, archived: false, createdAt: 1, updatedAt: 1, sortIndex: 0 } },
        tagsById: { tag1: { id: 'tag1', title: 'Tag', color: null, createdAt: 1, updatedAt: 1 } },
        historyByTaskId: { t1: [{ id: 'h1', taskId: 't1', type: 'created', at: 1, note: null }] },
        migratedLegacyDayTodosAt: 1,
      })
    );
    const tasks = require('./tasksStorage') as typeof import('./tasksStorage');
    const [task] = await tasks.getTasks();
    expect(task?.subtasks[0]?.title).toBe('sub');
    expect(task?.recurrence?.weekdays).toEqual([1, 3]);
  });

  it('prevents duplicate recurrence dates from generating by contract helper', () => {
    const { nextRecurrenceDate } = require('../../lib/todos/taskModel') as typeof import('../../lib/todos/taskModel');
    const rule = {
      id: 'r',
      frequency: 'weekdays' as const,
      interval: 1,
      startDate: '2026-05-08',
      endDate: null,
      weekdays: [],
      lastGeneratedDate: null,
    };
    expect(nextRecurrenceDate(rule, '2026-05-08')).toBe('2026-05-11');
  });

  it('handles weekly weekdays and month-end recurrence deterministically', () => {
    const { nextRecurrenceDate } = require('../../lib/todos/taskModel') as typeof import('../../lib/todos/taskModel');
    expect(
      nextRecurrenceDate(
        { id: 'r', frequency: 'weekly', interval: 1, startDate: '2026-05-11', endDate: null, weekdays: [1, 3], lastGeneratedDate: null },
        '2026-05-11'
      )
    ).toBe('2026-05-13');
    expect(
      nextRecurrenceDate(
        { id: 'm', frequency: 'monthly', interval: 1, startDate: '2026-01-31', endDate: null, weekdays: [], lastGeneratedDate: null },
        '2026-01-31'
      )
    ).toBe('2026-02-28');
  });

  it('generates due recurrence occurrences incrementally without duplicates after restart', async () => {
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.setItem(
      TASKS_KEY,
      JSON.stringify({
        version: 1,
        tasksById: {
          t1: {
            id: 't1',
            title: 'repeat',
            notes: '',
            status: 'open',
            priority: 'medium',
            listId: null,
            tagIds: [],
            subtasks: [],
            reminders: [],
            recurrence: {
              id: 'r1',
              frequency: 'daily',
              interval: 1,
              startDate: '2026-05-11',
              endDate: null,
              weekdays: [],
              lastGeneratedDate: null,
            },
            dueDate: '2026-05-11',
            sortIndex: 0,
            createdAt: 1,
            updatedAt: 1,
            completedAt: null,
            archivedAt: null,
            source: 'task',
          },
        },
        listsById: {},
        tagsById: {},
        historyByTaskId: {},
        migratedLegacyDayTodosAt: 1,
      })
    );

    const tasks = require('./tasksStorage') as typeof import('./tasksStorage');
    expect(await tasks.generateDueTaskRecurrences('2026-05-13', 1)).toEqual({ processedTemplates: 1, generatedOccurrences: 1 });
    tasks.resetTasksStorageSessionStateForTests();
    expect(await tasks.generateDueTaskRecurrences('2026-05-13', 1)).toEqual({ processedTemplates: 1, generatedOccurrences: 1 });
    tasks.resetTasksStorageSessionStateForTests();
    expect(await tasks.generateDueTaskRecurrences('2026-05-13', 1)).toEqual({ processedTemplates: 0, generatedOccurrences: 0 });

    const record = JSON.parse((await AsyncStorage.getItem(TASKS_KEY))!);
    expect(record.tasksById['recurrence:r1:2026-05-12']).toBeTruthy();
    expect(record.tasksById['recurrence:r1:2026-05-13']).toBeTruthy();
    expect(Object.keys(record.tasksById).filter((id) => id.startsWith('recurrence:r1:'))).toHaveLength(2);
  });
});
