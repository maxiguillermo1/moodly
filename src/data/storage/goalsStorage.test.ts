describe('goalsStorage foundation', () => {
  beforeEach(async () => {
    (globalThis as any).__MOODLY_CHAOS__ = undefined;
    jest.resetModules();
    const mod: any = require('@react-native-async-storage/async-storage');
    await (mod?.default ?? mod).clear();
    const { resetPersistenceBootstrapForTests } = require('../persistence/bootstrap') as typeof import('../persistence/bootstrap');
    resetPersistenceBootstrapForTests();
  });

  it('creates goals and returns defensive copies', async () => {
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    const created = await goals.upsertGoal({
      title: 'Read gently',
      type: 'target',
      progress: { currentValue: 0, targetValue: 10, unit: 'books', frequency: 'none' },
    });
    created.title = 'mutated';

    const list = await goals.getGoals();
    expect(list[0]?.title).toBe('Read gently');
    list[0]!.title = 'mutated again';
    expect((await goals.getGoals())[0]?.title).toBe('Read gently');
  });

  it('computes progress and streak with supportive insight', async () => {
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    const { computeGoalProgress } = require('../../lib/goals') as typeof import('../../lib/goals');
    const goal = await goals.upsertGoal({
      title: 'Meditate',
      type: 'habit',
      progress: { currentValue: 0, targetValue: 3, unit: 'times', frequency: 'weekly' },
      history: [
        { id: 'h1', date: '2026-05-10', value: 1, note: '', createdAt: 1 },
        { id: 'h2', date: '2026-05-11', value: 1, note: '', createdAt: 2 },
      ],
    });

    const result = computeGoalProgress(goal, '2026-05-11');
    expect(result.streak).toBe(2);
    expect(result.insight.message).toContain('2 days');
  });

  it('rejects invalid progress writes and sanitizes persisted goal history', async () => {
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    const goal = await goals.upsertGoal({
      title: 'Walk',
      type: 'habit',
      progress: { currentValue: Number.NaN, targetValue: Number.POSITIVE_INFINITY, unit: 'steps', frequency: 'daily' },
      history: [
        { id: 'bad-date', date: '2026-99-99', value: 1, note: '', createdAt: 1 },
        { id: 'bad-value', date: '2026-05-11', value: Number.NaN, note: '', createdAt: 2 },
        { id: 'good', date: '2026-05-11', value: 1, note: '', createdAt: 3 },
      ],
    });
    expect(goal.progress.currentValue).toBe(1);
    expect(goal.progress.targetValue).toBe(1);
    expect(goal.history).toHaveLength(1);
    expect(await goals.addGoalProgress(goal.id, 'bad-date', 1)).toBeNull();
    expect(await goals.addGoalProgress(goal.id, '2026-05-12', Number.NaN)).toBeNull();
    expect(await goals.addGoalProgress(goal.id, '2026-05-12', -1)).toBeNull();
  });

  it('stores a daily goal log note with progress history', async () => {
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    const goal = await goals.upsertGoal({
      title: 'Daily walk',
      type: 'target',
      progress: { currentValue: 0, targetValue: 30, unit: 'minutes per day', frequency: 'daily' },
    });
    const updated = await goals.addGoalProgress(goal.id, '2026-05-11', 20, 'Felt steady after lunch.');
    expect(updated?.history[0]).toMatchObject({
      date: '2026-05-11',
      value: 20,
      note: 'Felt steady after lunch.',
    });
  });

  it('updates the same-day note without increasing progress twice', async () => {
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    const goal = await goals.upsertGoal({
      title: 'Daily walk',
      type: 'target',
      progress: { currentValue: 0, targetValue: 30, unit: 'minutes per day', frequency: 'daily' },
    });
    const first = await goals.addGoalProgress(goal.id, '2026-05-11', 20, 'First log.');
    const second = await goals.addGoalProgress(goal.id, '2026-05-11', 20, 'Duplicate log.');
    expect(first?.progress.currentValue).toBe(20);
    expect(second?.progress.currentValue).toBe(20);
    expect(second?.history).toHaveLength(1);
    expect(second?.history[0]?.value).toBe(20);
    expect(second?.history[0]?.note).toBe('Duplicate log.');
  });

  it('updates same-day value when the note is unchanged (e.g. empty note)', async () => {
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    const goal = await goals.upsertGoal({
      title: 'Water',
      type: 'target',
      progress: { currentValue: 0, targetValue: 100, unit: 'ml', frequency: 'daily' },
    });
    const first = await goals.addGoalProgress(goal.id, '2026-05-11', 250, '');
    expect(first?.progress.currentValue).toBe(250);
    const second = await goals.addGoalProgress(goal.id, '2026-05-11', 400, '');
    expect(second?.progress.currentValue).toBe(400);
    expect(second?.history).toHaveLength(1);
    expect(second?.history[0]?.value).toBe(400);
  });

  it('uses duration days for percent and supports never-ending counters', async () => {
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    const { computeGoalProgress } = require('../../lib/goals') as typeof import('../../lib/goals');
    const goal = await goals.upsertGoal({
      title: 'Walk daily',
      type: 'habit',
      durationDays: 2,
      progress: { currentValue: 0, targetValue: 99, unit: 'times', frequency: 'daily' },
    });
    const first = await goals.addGoalProgress(goal.id, '2026-05-11', 1);
    expect(Math.round(computeGoalProgress(first!).percent)).toBe(50);
    const second = await goals.addGoalProgress(goal.id, '2026-05-12', 1);
    expect(Math.round(computeGoalProgress(second!).percent)).toBe(100);
    expect(second?.status).toBe('completed');

    const endless = await goals.upsertGoal({
      id: second!.id,
      title: second!.title,
      type: second!.type,
      status: 'active',
      category: second!.category,
      durationDays: null,
      progress: second!.progress,
      history: second!.history,
      completedAt: null,
    });
    expect(computeGoalProgress(endless).percent).toBe(0);
    expect(endless.status).toBe('active');
  });

  it('getGoalSummaries streak and percent match computeGoalProgress', async () => {
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    const { computeGoalProgress } = require('../../lib/goals') as typeof import('../../lib/goals');
    const { getToday } = require('../../lib/utils/date') as typeof import('../../lib/utils/date');
    const today = getToday();
    const [yy, mm, dd] = today.split('-').map(Number);
    const prev = new Date(yy || 1970, (mm || 1) - 1, dd || 1);
    prev.setDate(prev.getDate() - 1);
    const yesterday = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;

    await goals.upsertGoal({
      title: 'Streak check',
      type: 'habit',
      progress: { currentValue: 2, targetValue: 10, unit: '', frequency: 'daily' },
      history: [
        { id: 'a', date: yesterday, value: 1, note: '', createdAt: 1 },
        { id: 'b', date: today, value: 1, note: '', createdAt: 2 },
      ],
    });
    const list = await goals.getGoals();
    const summaries = await goals.getGoalSummaries();
    expect(summaries).toHaveLength(1);
    const g = list[0]!;
    const c = computeGoalProgress(g, today);
    expect(summaries[0]!.streak).toBe(c.streak);
    expect(summaries[0]!.completedToday).toBe(c.completedToday);
    expect(summaries[0]!.percent).toBeCloseTo(c.percent, 10);
    expect(summaries[0]!.loggedDays).toBe(2);
  });

  it('does not mutate paused goals through progress writes', async () => {
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    const goal = await goals.upsertGoal({
      title: 'Paused goal',
      type: 'habit',
      status: 'archived',
      progress: { currentValue: 0, targetValue: 10, unit: 'days', frequency: 'daily' },
    });
    const updated = await goals.addGoalProgress(goal.id, '2026-05-11', 1, 'Should not save');
    expect(updated?.progress.currentValue).toBe(0);
    expect(updated?.history).toHaveLength(0);
    expect(updated?.status).toBe('archived');
  });

  it('rejects progress writes on completed goals', async () => {
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    const g = await goals.upsertGoal({
      title: 'Done',
      type: 'habit',
      status: 'completed',
      progress: { currentValue: 0, targetValue: 1, unit: '', frequency: 'daily' },
      history: [{ id: 'h', date: '2026-05-01', value: 1, note: '', createdAt: 1 }],
    });
    const out = await goals.addGoalProgress(g.id, '2026-05-11', 1);
    expect(out?.history).toHaveLength(1);
    expect(out?.status).toBe('completed');
  });

  it('merges duplicate same-day history rows on upsert', async () => {
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    const g = await goals.upsertGoal({
      title: 'Dup',
      type: 'target',
      progress: { currentValue: 0, targetValue: 30, unit: 'm', frequency: 'daily' },
      history: [
        { id: 'a', date: '2026-05-11', value: 10, note: '', createdAt: 1 },
        { id: 'b', date: '2026-05-11', value: 30, note: 'win', createdAt: 99 },
      ],
    });
    expect(g.history.filter((h) => h.date === '2026-05-11')).toHaveLength(1);
    expect(g.history[0]!.value).toBe(30);
    expect(g.progress.currentValue).toBe(30);
  });

  it('completeGoal marks an active goal completed', async () => {
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    const g = await goals.upsertGoal({
      title: 'Finish line',
      type: 'habit',
      progress: { currentValue: 0, targetValue: 1, unit: '', frequency: 'daily' },
    });
    await goals.completeGoal(g.id);
    const list = await goals.getGoals();
    expect(list[0]?.status).toBe('completed');
    expect(list[0]?.completedAt).not.toBeNull();
  });

  it('migrates v1 disk record to v2 and snapshots pre-migration JSON', async () => {
    const mod = require('@react-native-async-storage/async-storage');
    const AsyncStorage = mod.default ?? mod;
    await AsyncStorage.setItem(
      'moodly.goals',
      JSON.stringify({
        version: 1,
        goalsById: {
          walk: {
            id: 'walk',
            title: 'Walk',
            type: 'habit',
            status: 'active',
            category: 'personal',
            progress: { currentValue: 0, targetValue: 3, unit: '', frequency: 'daily' },
            history: [],
          },
        },
      })
    );
    expect(await AsyncStorage.getItem('moodly.goals')).toContain('walk');
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    const pre = goals.testParseGoalsDiskJson(await AsyncStorage.getItem('moodly.goals'));
    expect(pre.corrupt).toBe(false);
    expect(pre.wasMigrated).toBe(true);
    expect(Object.keys(pre.record.goalsById)).toEqual(['walk']);
    await goals.getGoals();
    const raw = await AsyncStorage.getItem('moodly.goals');
    const body = JSON.parse(raw!) as { version: number; goalsById: Record<string, { id?: string }> };
    expect(body.version).toBe(2);
    expect(body.goalsById.walk?.id).toBe('walk');
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((k: string) => k.startsWith('moodly.goals.migrate_backup.'))).toBe(true);
  });

  it('does not re-backup when record is already v2', async () => {
    const mod = require('@react-native-async-storage/async-storage');
    const AsyncStorage = mod.default ?? mod;
    await AsyncStorage.setItem('moodly.goals', JSON.stringify({ version: 2, goalsById: {} }));
    const goals = require('./goalsStorage') as typeof import('./goalsStorage');
    goals.resetGoalsStorageSessionStateForTests();
    await goals.getGoals();
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((k: string) => k.startsWith('moodly.goals.migrate_backup.'))).toBe(false);
  });
});
