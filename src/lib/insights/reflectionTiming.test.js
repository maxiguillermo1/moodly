/**
 * @fileoverview Cooldown rules for insight surfacing.
 * @module lib/insights/reflectionTiming.test
 */
import { EMPTY_TIMING_STATE, filterInsightsByCooldowns, timingStateAfterRecording } from './reflectionTiming';
function q(partial) {
    return {
        tone: 'calm',
        priority: 10,
        params: {},
        confidence: 'medium',
        signalScore: 50,
        ...partial,
    };
}
describe('reflectionTiming', () => {
    it('suppresses topics still inside cooldown window', () => {
        const now = 1700000000000;
        const state = {
            schemaVersion: 1,
            topicLastSurfacedAtMs: { 'reflection.prompt': now - 60 * 60 * 1000 },
        };
        const list = [
            q({
                id: '1',
                topicId: 'reflection.prompt',
                messageKey: 'insights.prompt.reflective_rotation',
            }),
        ];
        const out = filterInsightsByCooldowns(list, state, now);
        expect(out).toHaveLength(0);
    });
    it('allows reflection.prompt after cooldown elapsed', () => {
        const now = 1700000000000;
        const state = {
            schemaVersion: 1,
            topicLastSurfacedAtMs: { 'reflection.prompt': now - 40 * 60 * 60 * 1000 },
        };
        const list = [
            q({
                id: '1',
                topicId: 'reflection.prompt',
                messageKey: 'insights.prompt.reflective_rotation',
            }),
        ];
        const out = filterInsightsByCooldowns(list, state, now);
        expect(out).toHaveLength(1);
    });
    it('updates timing state deterministically', () => {
        const prev = { ...EMPTY_TIMING_STATE, topicLastSurfacedAtMs: {} };
        const next = timingStateAfterRecording(prev, ['streak.mood', 'streak.mood'], 123);
        expect(next.topicLastSurfacedAtMs['streak.mood']).toBe(123);
    });
});
