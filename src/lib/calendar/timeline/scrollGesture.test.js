/**
 * @fileoverview Scroll gesture classification for timeline scroll-end handling.
 */
import { scrollDragReleaseWillDecelerate } from './scrollGesture';
import { TIMELINE_DRAG_COMMIT_VY_PMS } from './constants';
describe('scrollDragReleaseWillDecelerate', () => {
    const threshold = TIMELINE_DRAG_COMMIT_VY_PMS;
    it('returns true when upward fling exceeds threshold', () => {
        expect(scrollDragReleaseWillDecelerate(-0.12, threshold)).toBe(true);
    });
    it('returns true when downward fling exceeds threshold', () => {
        expect(scrollDragReleaseWillDecelerate(0.08, threshold)).toBe(true);
    });
    it('returns false for slow release (no momentum)', () => {
        expect(scrollDragReleaseWillDecelerate(0.01, threshold)).toBe(false);
        expect(scrollDragReleaseWillDecelerate(-0.02, threshold)).toBe(false);
    });
    it('returns false when velocity is missing', () => {
        expect(scrollDragReleaseWillDecelerate(undefined, threshold)).toBe(false);
    });
});
