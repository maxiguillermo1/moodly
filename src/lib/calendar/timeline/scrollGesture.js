/**
 * @fileoverview Scroll gesture classification for timeline scroll-end handling.
 * @module lib/calendar/timeline/scrollGesture
 */
/**
 * @returns true when inertia will likely continue — caller should wait for momentum end to flush.
 */
export function scrollDragReleaseWillDecelerate(velocityY, thresholdPtsPerMs) {
    return velocityY != null && Number.isFinite(velocityY) && Math.abs(velocityY) >= thresholdPtsPerMs;
}
