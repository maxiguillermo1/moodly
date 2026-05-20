/**
 * @fileoverview Integration tests for `insightsRepository` (local stores + engine).
 * @module data/repositories/insightsRepository.test
 */

describe('insightsRepository', () => {
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
    const insightTiming = require('../storage/insightsReflectionStateStorage') as typeof import('../storage/insightsReflectionStateStorage');
    insightTiming.insightsReflectionStateStorage.resetSessionCacheForTests();
  });

  it('returns stable weekly bundle for seeded mood days', async () => {
    const mood = require('../storage/moodStorage') as typeof import('../storage/moodStorage');
    await mood.upsertEntry({ date: '2026-08-04', mood: 'A', note: '', createdAt: 1, updatedAt: 1 });
    await mood.upsertEntry({ date: '2026-08-05', mood: 'B', note: 'x', createdAt: 1, updatedAt: 1 });
    const { insightsRepository } = require('./insightsRepository') as typeof import('./insightsRepository');
    const a = await insightsRepository.getWeeklyInsightBundle('2026-08-04');
    const b = await insightsRepository.getWeeklyInsightBundle('2026-08-04');
    expect(a.period).toEqual(b.period);
    expect(a.metrics.daysWithMoodEntry).toBeGreaterThanOrEqual(2);
    expect(a.insights.length).toBeGreaterThan(0);
    expect(a.insights.map((i) => i.id).join(',')).toBe(b.insights.map((i) => i.id).join(','));
    expect(a.insights.every((i) => typeof i.signalScore === 'number' && i.topicId.length > 0)).toBe(true);
  });

  it('returns empty insights for invalid week anchor', async () => {
    const { insightsRepository } = require('./insightsRepository') as typeof import('./insightsRepository');
    const bundle = await insightsRepository.getWeeklyInsightBundle('not-a-day');
    expect(bundle.insights).toHaveLength(0);
    expect(bundle.metrics.daysInPeriod).toBe(0);
  });

  it('returns monthly bundle for calendar month', async () => {
    const mood = require('../storage/moodStorage') as typeof import('../storage/moodStorage');
    await mood.upsertEntry({ date: '2026-09-10', mood: 'C', note: '', createdAt: 1, updatedAt: 1 });
    const { insightsRepository } = require('./insightsRepository') as typeof import('./insightsRepository');
    const bundle = await insightsRepository.getMonthlyInsightBundle('2026-09-15');
    expect(bundle.period.kind).toBe('month');
    expect(bundle.period.start).toBe('2026-09-01');
    expect(bundle.period.end >= '2026-09-28').toBe(true);
    expect(bundle.insights.length).toBeGreaterThan(0);
  });

  it('hides streak.mood after recordSurfaced until cooldown passes', async () => {
    const mood = require('../storage/moodStorage') as typeof import('../storage/moodStorage');
    for (let i = 0; i < 5; i++) {
      const d = `2026-08-${String(10 + i).padStart(2, '0')}`;
      await mood.upsertEntry({ date: d, mood: 'A', note: '', createdAt: 1, updatedAt: 1 });
    }
    const { insightsRepository } = require('./insightsRepository') as typeof import('./insightsRepository');
    const t0 = 1_800_000_000_000;
    const before = await insightsRepository.getWeeklyInsightBundle('2026-08-10', { nowMs: t0 });
    const hadStreak = before.insights.some((x) => x.topicId === 'streak.mood');
    if (!hadStreak) return;
    await insightsRepository.recordSurfacedInsightTopics(['streak.mood'], t0);
    const soon = await insightsRepository.getWeeklyInsightBundle('2026-08-10', { nowMs: t0 + 60 * 60 * 1000 });
    expect(soon.insights.some((x) => x.topicId === 'streak.mood')).toBe(false);
    const later = await insightsRepository.getWeeklyInsightBundle('2026-08-10', { nowMs: t0 + 100 * 60 * 60 * 1000 });
    expect(later.insights.some((x) => x.topicId === 'streak.mood')).toBe(true);
  });
});
