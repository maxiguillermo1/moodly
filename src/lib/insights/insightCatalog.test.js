/**
 * @fileoverview Template interpolation tests (localization-safe params).
 * @module lib/insights/insightCatalog.test
 */
import { formatInsightTemplate } from './insightCatalog';
describe('insightCatalog', () => {
    it('interpolates params deterministically', () => {
        const s = formatInsightTemplate('insights.streak.mood_logging', { days: 4 });
        expect(s).toContain('4');
        expect(s).toContain('mood');
    });
    it('uses softer catalog line for tentative habit correlation', () => {
        const s = formatInsightTemplate('insights.habit.mood_cooccurrence_tentative', {
            habitLabel: 'Reading',
            coDays: 3,
        });
        expect(s.toLowerCase()).toContain('gentle hint');
        expect(s).toContain('3');
    });
    it('formats goal journey arc', () => {
        const s = formatInsightTemplate('insights.goal.journey_arc_soft', { spanDays: 60 });
        expect(s).toContain('60');
    });
});
