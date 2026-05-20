/**
 * @fileoverview Tests for composed Daily Activity read model.
 * @module data/repositories/dailyActivityRepository.test
 */

describe('dailyActivityRepository', () => {
  beforeEach(async () => {
    (globalThis as any).__KAIRO_CHAOS__ = undefined;
    jest.resetModules();
    const mod: any = require('@react-native-async-storage/async-storage');
    await (mod?.default ?? mod).clear();
    const boot = require('../persistence/bootstrap') as typeof import('../persistence/bootstrap');
    boot.resetPersistenceBootstrapForTests();
    const mood = require('../storage/moodStorage') as typeof import('../storage/moodStorage');
    const goals = require('../storage/goalsStorage') as typeof import('../storage/goalsStorage');
    const habits = require('../storage/habitSelectionsStorage') as typeof import('../storage/habitSelectionsStorage');
    const habitTrack = require('../storage/habitTrackingStorage') as typeof import('../storage/habitTrackingStorage');
    const tasks = require('../storage/tasksStorage') as typeof import('../storage/tasksStorage');
    mood.resetEntriesStorageSessionStateForTests();
    goals.resetGoalsStorageSessionStateForTests();
    habits.resetHabitSelectionsStorageSessionStateForTests();
    habitTrack.resetHabitTrackingStorageSessionStateForTests();
    tasks.resetTasksStorageSessionStateForTests();
  });

  it('returns safe empty activity for invalid date', async () => {
    const { getDayActivity } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const a = await getDayActivity('2026-99-99');
    expect(a.metadata.warnings).toContain('invalid_date');
    expect(a.summary.hasAnyActivity).toBe(false);
  });

  it('empty day has no facets', async () => {
    const { getDayActivity } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const a = await getDayActivity('2026-06-01');
    expect(a.summary.hasAnyActivity).toBe(false);
    expect(a.mood.hasEntry).toBe(false);
    expect(a.habits.selectedIds).toHaveLength(0);
    expect(a.goals.items).toHaveLength(0);
    expect(a.reminders.items).toHaveLength(0);
  });

  it('mood-only day', async () => {
    const mood = require('../storage/moodStorage') as typeof import('../storage/moodStorage');
    await mood.upsertEntry({
      date: '2026-06-02',
      mood: 'B',
      note: '',
      createdAt: 1,
      updatedAt: 1,
    });
    const { getDayActivity } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const a = await getDayActivity('2026-06-02');
    expect(a.mood.hasEntry).toBe(true);
    expect(a.mood.grade).toBe('B');
    expect(a.journal.present).toBe(false);
    expect(a.summary.counts.mood).toBe(1);
  });

  it('journal note facet when note non-empty', async () => {
    const mood = require('../storage/moodStorage') as typeof import('../storage/moodStorage');
    await mood.upsertEntry({
      date: '2026-06-03',
      mood: 'A',
      note: '  Quiet reflection ',
      createdAt: 1,
      updatedAt: 2,
    });
    const { getDayActivity } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const a = await getDayActivity('2026-06-03');
    expect(a.journal.present).toBe(true);
    expect(a.journal.notePreview).toContain('Quiet reflection');
    expect(typeof a.journal.updatedAt).toBe('number');
    expect(a.summary.counts.journalNote).toBe(1);
  });

  it('habit-only day', async () => {
    const habits = require('../storage/habitSelectionsStorage') as typeof import('../storage/habitSelectionsStorage');
    const habitTrack = require('../storage/habitTrackingStorage') as typeof import('../storage/habitTrackingStorage');
    await habitTrack.setTrackedHabitIds(['drink_water']);
    await habits.toggleHabitForDate('2026-06-04', 'drink_water');
    const { getDayActivity } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const a = await getDayActivity('2026-06-04');
    expect(a.habits.selectedIds).toContain('drink_water');
    expect(a.habits.trackedIds).toContain('drink_water');
    expect(a.summary.counts.habits).toBeGreaterThan(0);
  });

  it('goal-only day', async () => {
    const goals = require('../storage/goalsStorage') as typeof import('../storage/goalsStorage');
    const g = await goals.upsertGoal({
      title: 'Walk block',
      type: 'habit',
      progress: { currentValue: 0, targetValue: 5, unit: 'd', frequency: 'daily' },
    });
    await goals.addGoalProgress(g.id, '2026-06-05', 1);
    const { getDayActivity } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const a = await getDayActivity('2026-06-05');
    const row = a.goals.items.find((x) => x.id === g.id);
    expect(row?.completedToday).toBe(true);
    expect(row?.valueOnDate).toBe(1);
    expect(a.summary.counts.goalsWithProgress).toBeGreaterThan(0);
  });

  it('reminder-only day', async () => {
    const tasks = require('../storage/tasksStorage') as typeof import('../storage/tasksStorage');
    await tasks.addTaskForDate('2026-06-06', 'Buy milk');
    const { getDayActivity } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const a = await getDayActivity('2026-06-06');
    expect(a.reminders.items).toHaveLength(1);
    expect(a.reminders.items[0]?.title).toContain('Buy milk');
    expect(a.summary.counts.reminders).toBe(1);
  });

  it('full day combines facets', async () => {
    const mood = require('../storage/moodStorage') as typeof import('../storage/moodStorage');
    const habits = require('../storage/habitSelectionsStorage') as typeof import('../storage/habitSelectionsStorage');
    const habitTrack = require('../storage/habitTrackingStorage') as typeof import('../storage/habitTrackingStorage');
    const goals = require('../storage/goalsStorage') as typeof import('../storage/goalsStorage');
    const tasks = require('../storage/tasksStorage') as typeof import('../storage/tasksStorage');
    await mood.upsertEntry({
      date: '2026-06-07',
      mood: 'A+',
      note: 'Great day',
      createdAt: 1,
      updatedAt: 1,
    });
    await habitTrack.setTrackedHabitIds(['workout']);
    await habits.toggleHabitForDate('2026-06-07', 'workout');
    const g = await goals.upsertGoal({
      title: 'Read',
      type: 'target',
      progress: { currentValue: 0, targetValue: 10, unit: 'm', frequency: 'daily' },
    });
    await goals.addGoalProgress(g.id, '2026-06-07', 5);
    await tasks.addTaskForDate('2026-06-07', 'Call');
    const { getDayActivity } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const a = await getDayActivity('2026-06-07');
    expect(a.summary.hasAnyActivity).toBe(true);
    expect(a.summary.counts.mood).toBe(1);
    expect(a.summary.counts.journalNote).toBe(1);
    expect(a.summary.counts.habits).toBeGreaterThan(0);
    expect(a.summary.counts.goalsWithProgress).toBeGreaterThan(0);
    expect(a.summary.counts.reminders).toBe(1);
  });

  it('getDayActivityRange batches mood via one getAllEntries', async () => {
    const mood = require('../storage/moodStorage') as typeof import('../storage/moodStorage');
    await mood.upsertEntry({
      date: '2026-07-01',
      mood: 'C',
      note: '',
      createdAt: 1,
      updatedAt: 1,
    });
    await mood.upsertEntry({
      date: '2026-07-03',
      mood: 'D',
      note: '',
      createdAt: 1,
      updatedAt: 1,
    });
    const spy = jest.spyOn(mood, 'getAllEntries');
    const { getDayActivityRange } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const map = await getDayActivityRange('2026-07-01', '2026-07-03');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(map['2026-07-01']?.mood.grade).toBe('C');
    expect(map['2026-07-02']?.summary.hasAnyActivity).toBe(false);
    expect(map['2026-07-03']?.mood.grade).toBe('D');
    spy.mockRestore();
  });

  it('range invalid returns single-key safe payload', async () => {
    const { getDayActivityRange } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const map = await getDayActivityRange('not-a-date', '2026-08-01');
    expect(Object.keys(map)).toHaveLength(1);
    expect(map['not-a-date']?.metadata.warnings).toContain('invalid_range');
  });

  it('enumerateLocalDateRangeInclusive returns null for invalid keys', () => {
    const { enumerateLocalDateRangeInclusive } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    expect(enumerateLocalDateRangeInclusive('x', '2026-01-01')).toBeNull();
  });

  it('truncates very long ranges', () => {
    const { enumerateLocalDateRangeInclusive, MAX_DAILY_ACTIVITY_RANGE_DAYS } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const res = enumerateLocalDateRangeInclusive('2020-01-01', '2035-12-31');
    expect(res).not.toBeNull();
    expect(res!.dates.length).toBe(MAX_DAILY_ACTIVITY_RANGE_DAYS);
    expect(res!.truncated).toBe(true);
    expect(res!.warnings).toContain('range_truncated');
  });

  it('getTodayActivity uses local today key', async () => {
    const { getTodayActivity } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const { getToday } = require('../../lib/utils/date') as typeof import('../../lib/utils/date');
    const a = await getTodayActivity();
    expect(a.date).toBe(getToday());
  });

  it('read path does not write mood entries', async () => {
    const mood = require('../storage/moodStorage') as typeof import('../storage/moodStorage');
    const spy = jest.spyOn(mood, 'upsertEntry');
    const { getDayActivity, getDayActivityRange } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    await getDayActivity('2026-09-01');
    await getDayActivityRange('2026-09-01', '2026-09-02');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('compose failure returns safe empty row', async () => {
    const mood = require('../storage/moodStorage') as typeof import('../storage/moodStorage');
    const spy = jest.spyOn(mood, 'getEntry').mockRejectedValueOnce(new Error('simulated io'));
    const { getDayActivity } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const a = await getDayActivity('2026-10-01');
    spy.mockRestore();
    expect(a.metadata.warnings).toContain('compose_failed');
    expect(a.summary.hasAnyActivity).toBe(false);
  });

  it('range compose failure fills all dates safely', async () => {
    const mood = require('../storage/moodStorage') as typeof import('../storage/moodStorage');
    const spy = jest.spyOn(mood, 'getAllEntries').mockRejectedValueOnce(new Error('simulated io'));
    const { getDayActivityRange } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const map = await getDayActivityRange('2026-11-01', '2026-11-02');
    spy.mockRestore();
    expect(map['2026-11-01']?.metadata.warnings).toContain('range_compose_failed');
    expect(map['2026-11-02']?.metadata.warnings).toContain('range_compose_failed');
  });

  it('range batches goals and habit snapshot (not per-day habit reads)', async () => {
    const goals = require('../storage/goalsStorage') as typeof import('../storage/goalsStorage');
    const habits = require('../storage/habitSelectionsStorage') as typeof import('../storage/habitSelectionsStorage');
    const spyGoals = jest.spyOn(goals, 'getGoals');
    const spySnap = jest.spyOn(habits, 'getHabitSelectionsRecordSnapshot');
    const spyPerDay = jest.spyOn(habits, 'getHabitSelectionsForDate');
    const { getDayActivityRange } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    await getDayActivityRange('2026-12-01', '2026-12-05');
    expect(spyGoals).toHaveBeenCalledTimes(1);
    expect(spySnap).toHaveBeenCalledTimes(1);
    expect(spyPerDay).not.toHaveBeenCalled();
    spyGoals.mockRestore();
    spySnap.mockRestore();
    spyPerDay.mockRestore();
  });

  it('getDayActivityRange aligns reminders across batched storage reads (wide range)', async () => {
    const tasks = require('../storage/tasksStorage') as typeof import('../storage/tasksStorage');
    await tasks.addTaskForDate('2026-01-01', 'first');
    await tasks.addTaskForDate('2026-02-19', 'last');
    const { getDayActivityRange } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const map = await getDayActivityRange('2026-01-01', '2026-02-19');
    expect(Object.keys(map)).toHaveLength(50);
    expect(map['2026-01-01']?.reminders.items).toHaveLength(1);
    expect(map['2026-01-01']?.reminders.items[0]?.title).toContain('first');
    expect(map['2026-02-19']?.reminders.items).toHaveLength(1);
    expect(map['2026-02-19']?.reminders.items[0]?.title).toContain('last');
    expect(map['2026-01-15']?.reminders.items).toHaveLength(0);
    expect(map['2026-01-15']?.summary.counts.reminders).toBe(0);
  });

  it('skips goals that fail canonicalization without losing mood or valid goals', async () => {
    const mood = require('../storage/moodStorage') as typeof import('../storage/moodStorage');
    const goals = require('../storage/goalsStorage') as typeof import('../storage/goalsStorage');
    await mood.upsertEntry({
      date: '2026-06-20',
      mood: 'B',
      note: '',
      createdAt: 1,
      updatedAt: 1,
    });
    const g = await goals.upsertGoal({
      title: 'Walk',
      type: 'habit',
      progress: { currentValue: 0, targetValue: 5, unit: 'd', frequency: 'daily' },
    });
    const stored = await goals.getGoals();
    const spy = jest.spyOn(goals, 'getGoals').mockResolvedValueOnce([{ id: 'broken' } as any, ...stored]);
    const { getDayActivity } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const a = await getDayActivity('2026-06-20');
    spy.mockRestore();
    expect(a.mood.hasEntry).toBe(true);
    expect(a.mood.grade).toBe('B');
    expect(a.goals.items.some((row) => row.id === g.id)).toBe(true);
    expect(a.goals.items.some((row) => row.id === 'broken')).toBe(false);
  });

  it('tolerates partial mood row from storage without throwing', async () => {
    const mood = require('../storage/moodStorage') as typeof import('../storage/moodStorage');
    const spy = jest.spyOn(mood, 'getEntry').mockResolvedValueOnce({
      date: '2026-12-10',
      note: null,
      updatedAt: 'not-a-number' as unknown as number,
    } as any);
    const { getDayActivity } = require('./dailyActivityRepository') as typeof import('./dailyActivityRepository');
    const a = await getDayActivity('2026-12-10');
    spy.mockRestore();
    expect(a.date).toBe('2026-12-10');
    expect(a.journal.updatedAt).toBeNull();
  });
});
