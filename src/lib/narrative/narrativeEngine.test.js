/**
 * @fileoverview Deterministic narrative engine tests (synthetic Daily Activity).
 * @module lib/narrative/narrativeEngine.test
 */
import { addLocalDays } from '../insights/periodBounds';
import { runNarrativeEngine } from './narrativeEngine';
function baseRow(date) {
    return {
        date,
        mood: { present: false, grade: null, hasEntry: false },
        journal: { present: false, notePreview: '', updatedAt: null },
        habits: { selectedIds: [], trackedIds: [] },
        goals: { items: [] },
        reminders: { items: [] },
        calendar: { monthKey: date.slice(0, 7), hasMoodEntry: false, moodGrade: null },
        summary: {
            counts: { mood: 0, journalNote: 0, habits: 0, goalsWithProgress: 0, reminders: 0 },
            hasAnyActivity: false,
        },
        metadata: { composedAt: 1, date, warnings: [] },
    };
}
function activeRow(date) {
    return {
        ...baseRow(date),
        mood: { present: true, grade: 'B', hasEntry: true },
        calendar: { monthKey: date.slice(0, 7), hasMoodEntry: true, moodGrade: 'B' },
        summary: {
            counts: { mood: 1, journalNote: 0, habits: 0, goalsWithProgress: 0, reminders: 0 },
            hasAnyActivity: true,
        },
    };
}
function journalRow(date) {
    return {
        ...activeRow(date),
        journal: { present: true, notePreview: 'x', updatedAt: 1 },
        summary: {
            counts: { mood: 1, journalNote: 1, habits: 0, goalsWithProgress: 0, reminders: 0 },
            hasAnyActivity: true,
        },
    };
}
function fillRange(start, n, fn) {
    const out = {};
    let d = start;
    for (let i = 0; i < n; i++) {
        out[d] = fn(d);
        d = addLocalDays(d, 1);
    }
    return out;
}
describe('narrativeEngine', () => {
    it('is deterministic for the same window + activities', () => {
        const window = { start: '2026-03-01', end: '2026-03-28' };
        const activities = fillRange('2026-03-01', 28, activeRow);
        const a = runNarrativeEngine({ window, activities });
        const b = runNarrativeEngine({ window, activities });
        expect(a.digest).toBe(b.digest);
        expect(a.artifacts.map((x) => x.id).join('|')).toBe(b.artifacts.map((x) => x.id).join('|'));
    });
    it('emits a transition when a quiet fortnight precedes a more active one', () => {
        const window = { start: '2026-04-01', end: '2026-04-28' };
        const activities = {};
        let d = '2026-04-01';
        for (let i = 0; i < 28; i++) {
            activities[d] = i < 14 ? baseRow(d) : activeRow(d);
            d = addLocalDays(d, 1);
        }
        const bundle = runNarrativeEngine({ window, activities });
        expect(bundle.chapters.length).toBeGreaterThanOrEqual(1);
        expect(bundle.artifacts.some((x) => x.messageKey === 'narrative.transition.toward_consistency')).toBe(true);
    });
    it('detects journal rebuild signal across halves', () => {
        const window = { start: '2026-05-01', end: '2026-06-14' };
        const activities = {};
        let d = '2026-05-01';
        for (let i = 0; i < 45; i++) {
            activities[d] = i < 20 ? activeRow(d) : journalRow(d);
            d = addLocalDays(d, 1);
        }
        const bundle = runNarrativeEngine({ window, activities });
        expect(bundle.artifacts.some((x) => x.messageKey === 'narrative.continuity.journal_rebuilding')).toBe(true);
    });
    it('handles large synthetic windows without throwing', () => {
        const start = '2025-01-01';
        const activities = fillRange(start, 200, activeRow);
        const end = addLocalDays(start, 199);
        const window = { start, end };
        const bundle = runNarrativeEngine({ window, activities });
        expect(bundle.chapters.length).toBeGreaterThan(0);
        expect(bundle.artifacts.length).toBeGreaterThan(0);
    });
    it('always ends with gentle span overview', () => {
        const window = { start: '2026-07-01', end: '2026-07-14' };
        const activities = fillRange('2026-07-01', 14, baseRow);
        const bundle = runNarrativeEngine({ window, activities });
        expect(bundle.artifacts[bundle.artifacts.length - 1]?.messageKey).toBe('narrative.summary.gentle_span_overview');
    });
    it('surfaces journal streak milestone when eligible', () => {
        const start = '2026-08-01';
        const activities = {};
        let d = start;
        for (let i = 0; i < 35; i++) {
            activities[d] = journalRow(d);
            d = addLocalDays(d, 1);
        }
        const end = addLocalDays(start, 34);
        const bundle = runNarrativeEngine({ window: { start, end }, activities });
        expect(bundle.artifacts.some((x) => x.messageKey === 'narrative.milestone.journal_streak_window')).toBe(true);
    });
});
