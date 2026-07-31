/**
 * @fileoverview Narrative catalog interpolation.
 * @module lib/narrative/narrativeCatalog.test
 */
import { formatNarrativeTemplate } from './narrativeCatalog';
describe('narrativeCatalog', () => {
    it('interpolates overview params', () => {
        const s = formatNarrativeTemplate('narrative.summary.gentle_span_overview', { spanDays: 30, activeDays: 12 });
        expect(s).toContain('30');
        expect(s).toContain('12');
    });
});
