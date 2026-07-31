/**
 * @fileoverview Tests for goal journey span signal.
 * @module lib/insights/journeySignals.test
 */
import { maybeGoalJourneyArtifact } from './journeySignals';
const period = { kind: 'month', start: '2026-01-01', end: '2026-01-31' };
function goalLongArc(status = 'active') {
    return {
        id: 'g1',
        type: 'habit',
        status,
        title: 'Walk',
        category: 'health',
        customCategory: null,
        accentColor: '#000',
        progress: { currentValue: 2, targetValue: 1, unit: 'x', frequency: 'daily' },
        reminder: null,
        milestones: [],
        history: [
            { id: 'h1', date: '2025-06-01', value: 1, note: '', createdAt: 1 },
            { id: 'h2', date: '2025-08-10', value: 1, note: '', createdAt: 2 },
        ],
        notes: '',
        durationDays: null,
        createdAt: 1,
        updatedAt: 1,
        completedAt: null,
        archivedAt: status === 'archived' ? 2 : null,
    };
}
function goalShortSpan() {
    return {
        ...goalLongArc(),
        id: 'g2',
        history: [
            { id: 'a', date: '2026-01-01', value: 1, note: '', createdAt: 1 },
            { id: 'b', date: '2026-01-10', value: 1, note: '', createdAt: 2 },
        ],
    };
}
describe('journeySignals', () => {
    it('returns null when longest span is below threshold', () => {
        expect(maybeGoalJourneyArtifact(period, [goalShortSpan()])).toBeNull();
    });
    it('emits gentle arc when an active goal spans enough local days', () => {
        const art = maybeGoalJourneyArtifact(period, [goalLongArc()]);
        expect(art).not.toBeNull();
        expect(art?.messageKey).toBe('insights.goal.journey_arc_soft');
        expect(art?.params.spanDays).toBeGreaterThanOrEqual(45);
    });
    it('ignores non-active goals', () => {
        expect(maybeGoalJourneyArtifact(period, [goalLongArc('archived')])).toBeNull();
    });
});
