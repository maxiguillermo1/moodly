/**
 * @fileoverview Pure plan for extending the bounded month window (scroll-past-edge recovery).
 * @module lib/calendar/timeline/windowExtendPlan
 */
/**
 * Mirrors CalendarScreen window growth: keeps length ≤ cap by trimming the far side when needed.
 */
export function planTimelineWindowExtend(args) {
    const { edge, anchorIndex, offsets, lastWindowKey, cap, extendBy } = args;
    const { start, end } = offsets;
    if (edge === 'start') {
        const newStart = start - extendBy;
        let newEnd = end;
        const newLen = newEnd - newStart + 1;
        if (newLen > cap)
            newEnd -= newLen - cap;
        const windowKey = `${newStart}:${newEnd}`;
        if (windowKey === lastWindowKey)
            return { kind: 'unchanged' };
        return {
            kind: 'extend',
            offsets: { start: newStart, end: newEnd },
            windowKey,
            recenterIndex: anchorIndex + extendBy,
        };
    }
    let newStart = start;
    const newEnd = end + extendBy;
    const newLen = newEnd - newStart + 1;
    let trimmed = 0;
    if (newLen > cap) {
        trimmed = newLen - cap;
        newStart += trimmed;
    }
    const windowKey = `${newStart}:${newEnd}`;
    if (windowKey === lastWindowKey)
        return { kind: 'unchanged' };
    return {
        kind: 'extend',
        offsets: { start: newStart, end: newEnd },
        windowKey,
        recenterIndex: anchorIndex - trimmed,
    };
}
