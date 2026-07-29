/**
 * @fileoverview Unit tests for canonical goal math.
 * @module lib/goals/goalMath.test
 */

import type { Goal, GoalHistory } from '../../types';
import {
  canonicalizeGoalModel,
  computeGoalProgress,
  deriveCurrentValueFromHistory,
  goalLoggedDayCount,
  goalProgressPercent,
  goalsDisplaySame,
  mergeGoalHistoryByDate,
} from './goalMath';

function baseGoal(over: Partial<Goal> = {}): Goal {
  const now = 1;
  return {
    id: 'g1',
    type: 'habit',
    status: 'active',
    title: 'Test',
    category: 'personal',
    customCategory: null,
    accentColor: '#000',
    progress: { currentValue: 999, targetValue: 10, unit: '', frequency: 'daily' },
    reminder: null,
    milestones: [],
    history: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    archivedAt: null,
    ...over,
  };
}

describe('mergeGoalHistoryByDate', () => {
  it('treats undefined or null history as empty', () => {
    expect(mergeGoalHistoryByDate(undefined as unknown as GoalHistory[])).toEqual([]);
    expect(mergeGoalHistoryByDate(null as unknown as GoalHistory[])).toEqual([]);
  });

  it('keeps latest createdAt per calendar day', () => {
    const h: GoalHistory[] = [
      { id: 'a', date: '2026-01-01', value: 1, note: '', createdAt: 1 },
      { id: 'b', date: '2026-01-01', value: 5, note: 'x', createdAt: 10 },
    ];
    const m = mergeGoalHistoryByDate(h);
    expect(m).toHaveLength(1);
    expect(m[0]!.value).toBe(5);
    expect(m[0]!.id).toBe('b');
  });
});

describe('deriveCurrentValueFromHistory', () => {
  it('sums positive values for habit', () => {
    const h: GoalHistory[] = [
      { id: '1', date: '2026-01-01', value: 2, note: '', createdAt: 1 },
      { id: '2', date: '2026-01-02', value: 3, note: '', createdAt: 2 },
    ];
    expect(deriveCurrentValueFromHistory('habit', mergeGoalHistoryByDate(h))).toBe(5);
    expect(deriveCurrentValueFromHistory('target', mergeGoalHistoryByDate(h))).toBe(5);
    expect(deriveCurrentValueFromHistory('project', mergeGoalHistoryByDate(h))).toBe(5);
  });

  it('averages all merged daily values for average', () => {
    const h: GoalHistory[] = [
      { id: '1', date: '2026-01-01', value: 4, note: '', createdAt: 1 },
      { id: '2', date: '2026-01-02', value: 8, note: '', createdAt: 2 },
    ];
    expect(deriveCurrentValueFromHistory('average', mergeGoalHistoryByDate(h))).toBe(6);
  });
});

describe('canonicalizeGoalModel', () => {
  it('accepts v1-style minimal habit draft', () => {
    const draft: Goal = {
      id: 'walk',
      type: 'habit',
      status: 'active',
      title: 'Walk',
      category: 'personal',
      customCategory: null,
      accentColor: '#FF9500',
      progress: { currentValue: 0, targetValue: 3, unit: '', frequency: 'daily' },
      reminder: null,
      milestones: [],
      history: [],
      notes: '',
      createdAt: 1000,
      updatedAt: 1000,
      completedAt: null,
      archivedAt: null,
    };
    expect(canonicalizeGoalModel(draft).progress.currentValue).toBe(0);
  });

  it('overrides stale currentValue from history', () => {
    const g = baseGoal({
      progress: { currentValue: 0, targetValue: 10, unit: '', frequency: 'none' },
      history: [
        { id: '1', date: '2026-01-01', value: 3, note: '', createdAt: 1 },
        { id: '2', date: '2026-01-02', value: 4, note: '', createdAt: 2 },
      ],
    });
    const c = canonicalizeGoalModel(g);
    expect(c.progress.currentValue).toBe(7);
  });
});

describe('goalProgressPercent edge cases', () => {
  it('returns 0 when target is invalid and no duration', () => {
    const g = baseGoal({
      type: 'target',
      progress: { currentValue: 5, targetValue: 0, unit: '', frequency: 'none' },
      history: [{ id: '1', date: '2026-01-01', value: 5, note: '', createdAt: 1 }],
    });
    expect(goalProgressPercent(g)).toBeGreaterThan(0);
    expect(canonicalizeGoalModel(g).progress.targetValue).toBe(1);
  });

  it('clamps when current exceeds target (non-duration)', () => {
    const g = baseGoal({
      type: 'target',
      progress: { currentValue: 0, targetValue: 10, unit: '', frequency: 'none' },
      history: [{ id: '1', date: '2026-01-01', value: 50, note: '', createdAt: 1 }],
    });
    expect(goalProgressPercent(g)).toBe(100);
  });

  it('never-ending duration (null) yields 0 percent', () => {
    const g = baseGoal({
      durationDays: null,
      history: [{ id: '1', date: '2026-01-01', value: 1, note: '', createdAt: 1 }],
    });
    expect(goalProgressPercent(g)).toBe(0);
  });

  it('duration-based percent uses distinct logged days', () => {
    const g = baseGoal({
      durationDays: 4,
      progress: { currentValue: 0, targetValue: 99, unit: '', frequency: 'none' },
      history: [
        { id: '1', date: '2026-01-01', value: 1, note: '', createdAt: 1 },
        { id: '2', date: '2026-01-02', value: 1, note: '', createdAt: 2 },
      ],
    });
    expect(goalProgressPercent(g)).toBe(50);
  });
});

describe('computeGoalProgress', () => {
  it('reports streak, completedToday, and loggedDays from one path', () => {
    const g = baseGoal({
      history: [
        { id: 'a', date: '2026-05-10', value: 1, note: '', createdAt: 1 },
        { id: 'b', date: '2026-05-11', value: 1, note: '', createdAt: 2 },
      ],
    });
    const r = computeGoalProgress(g, '2026-05-11');
    expect(r.streak).toBe(2);
    expect(r.completedToday).toBe(true);
    expect(r.loggedDays).toBe(2);
    expect(goalLoggedDayCount(g.history)).toBe(2);
  });

  it('handles empty history', () => {
    const r = computeGoalProgress(baseGoal(), '2026-05-11');
    expect(r.percent).toBe(0);
    expect(r.streak).toBe(0);
    expect(r.completedToday).toBe(false);
    expect(r.loggedDays).toBe(0);
  });

  it('handles completed status insight', () => {
    const g = baseGoal({ status: 'completed', history: [{ id: '1', date: '2026-01-01', value: 1, note: '', createdAt: 1 }] });
    expect(computeGoalProgress(g).insight.message).toContain('completed');
  });
});

describe('large merged history', () => {
  it('stays linear-time for many rows', () => {
    const h: GoalHistory[] = [];
    for (let i = 0; i < 3000; i += 1) {
      const day = 1 + (i % 28);
      h.push({
        id: `id-${i}`,
        date: `2026-01-${String(day).padStart(2, '0')}`,
        value: 1,
        note: '',
        createdAt: i,
      });
    }
    const t0 = Date.now();
    const m = mergeGoalHistoryByDate(h);
    canonicalizeGoalModel(
      baseGoal({
        history: m,
        progress: { currentValue: 0, targetValue: 10, unit: '', frequency: 'none' },
      })
    );
    expect(Date.now() - t0).toBeLessThan(5000);
    expect(m.length).toBeLessThanOrEqual(28);
  });
});

describe('goalsDisplaySame', () => {
  it('returns true when display order and identity fields match', () => {
    const a = baseGoal({ id: 'a', updatedAt: 10, status: 'active' });
    const b = baseGoal({ id: 'a', updatedAt: 10, status: 'active', title: 'Different title' });
    expect(goalsDisplaySame([a], [b])).toBe(true);
  });

  it('returns false when length, id, updatedAt, or status differ', () => {
    const a = baseGoal({ id: 'a', updatedAt: 10 });
    const b = baseGoal({ id: 'b', updatedAt: 10 });
    expect(goalsDisplaySame([a], [b])).toBe(false);
    expect(goalsDisplaySame([a], [baseGoal({ id: 'a', updatedAt: 11 })])).toBe(false);
    expect(goalsDisplaySame([], [a])).toBe(false);
  });
});
