const STORAGE_KEY = 'moodly.dayTodos';
const TASKS_KEY = 'moodly.tasks';

describe('dayTodosStorage resilience', () => {
  beforeEach(async () => {
    (globalThis as any).__MOODLY_CHAOS__ = undefined;
    jest.resetModules();
    const mod: any = require('@react-native-async-storage/async-storage');
    await (mod?.default ?? mod).clear();
  });

  it('corrupt JSON yields empty record (no crash)', async () => {
    const { getDayTodosForDate } = require('./dayTodosStorage') as typeof import('./dayTodosStorage');
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.setItem(STORAGE_KEY, '{not json');
    const items = await getDayTodosForDate('2026-06-01');
    expect(items).toEqual([]);
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify({}));
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((k: string) => k.startsWith(`${STORAGE_KEY}.corrupt.`))).toBe(true);
  });

  it('addDayTodo round-trips after simulated cold session (disk intact)', async () => {
    const dayTodos = require('./dayTodosStorage') as typeof import('./dayTodosStorage');
    const { resetPersistenceBootstrapForTests } = require('../persistence/bootstrap');
    await dayTodos.addDayTodo('2026-06-02', '  buy milk  ');
    dayTodos.resetDayTodosStorageSessionStateForTests();
    resetPersistenceBootstrapForTests();
    const items = await dayTodos.getDayTodosForDate('2026-06-02');
    expect(items.length).toBe(1);
    expect(items[0]?.title).toBe('buy milk');
  });

  it('normalizes partial malformed rows without dropping valid days', async () => {
    const { getDayTodosForDate } = require('./dayTodosStorage') as typeof import('./dayTodosStorage');
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        '2026-06-03': [
          { id: 'b', title: ' second ', done: false, createdAt: 20, sortIndex: 2, reminderMinutes: 1500 },
          { id: '', title: 'missing id', done: false, createdAt: 1, sortIndex: 0 },
          { id: 'a', title: 'first', done: true, createdAt: 10, sortIndex: 1, reminderMinutes: 9.6 },
          { id: 'empty', title: '   ', done: false, createdAt: 30, sortIndex: 3 },
        ],
        '2026-02-31': [{ id: 'bad-date', title: 'ignored', done: false, createdAt: 1, sortIndex: 0 }],
      })
    );

    const items = await getDayTodosForDate('2026-06-03');

    expect(items.map((item) => item.id)).toEqual(['dayTodo:2026-06-03:a', 'dayTodo:2026-06-03:b']);
    expect(items[0]?.reminderMinutes).toBe(10);
    expect(items[1]?.reminderMinutes).toBeNull();
    expect(await getDayTodosForDate('2026-02-28')).toEqual([]);
  });

  it('rejects stale reorder requests without rewriting current order', async () => {
    const dayTodos = require('./dayTodosStorage') as typeof import('./dayTodosStorage');
    const first = await dayTodos.addDayTodo('2026-06-04', 'one');
    const second = await dayTodos.addDayTodo('2026-06-04', 'two');
    const before = second.map((item) => item.id);

    const result = await dayTodos.reorderOpenDayTodos('2026-06-04', [first[0]!.id]);

    expect(result.map((item) => item.id)).toEqual(before);
    expect((await dayTodos.getDayTodosForDate('2026-06-04')).map((item) => item.id)).toEqual(before);
  });

  it('drops the day key after clearing the last completed todo', async () => {
    const dayTodos = require('./dayTodosStorage') as typeof import('./dayTodosStorage');
    const mod: any = require('@react-native-async-storage/async-storage');
    const AsyncStorage: any = mod?.default ?? mod;
    const [item] = await dayTodos.addDayTodo('2026-06-05', 'done item');
    await dayTodos.setDayTodoDone('2026-06-05', item!.id, true);

    await expect(dayTodos.clearCompletedDayTodos('2026-06-05')).resolves.toEqual([]);

    const raw = JSON.parse((await AsyncStorage.getItem(TASKS_KEY))!);
    expect(Object.values(raw.tasksById).some((task: any) => task.dueDate === '2026-06-05')).toBe(false);
  });

  it('returns defensive copies so callers cannot mutate cached todo items', async () => {
    const dayTodos = require('./dayTodosStorage') as typeof import('./dayTodosStorage');
    const [created] = await dayTodos.addDayTodo('2026-06-06', 'immutable');
    created!.title = 'mutated from add result';

    const first = await dayTodos.getDayTodosForDate('2026-06-06');
    expect(first[0]?.title).toBe('immutable');
    first[0]!.title = 'mutated from read result';

    const second = await dayTodos.getDayTodosForDate('2026-06-06');
    expect(second[0]?.title).toBe('immutable');

    const afterDone = await dayTodos.setDayTodoDone('2026-06-06', second[0]!.id, true);
    afterDone[0]!.done = false;
    expect((await dayTodos.getDayTodosForDate('2026-06-06'))[0]?.done).toBe(true);
  });

  it('preserves unrelated dense days when mutating one day', async () => {
    const dayTodos = require('./dayTodosStorage') as typeof import('./dayTodosStorage');
    const dates = Array.from({ length: 40 }, (_, i) => {
      const d = new Date(2026, 6, i + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    for (const date of dates) {
      await dayTodos.addDayTodo(date, `task ${date}`);
    }

    const [target] = await dayTodos.getDayTodosForDate('2026-07-20');
    await dayTodos.setDayTodoReminder('2026-07-20', target!.id, 540);
    dayTodos.resetDayTodosStorageSessionStateForTests();

    expect((await dayTodos.getDayTodosForDate('2026-07-01'))[0]?.title).toBe('task 2026-07-01');
    expect((await dayTodos.getDayTodosForDate('2026-07-20'))[0]?.reminderMinutes).toBe(540);
    expect((await dayTodos.getDayTodosForDate('2026-08-15'))).toEqual([]);
  });
});
