/**
 * @fileoverview Apply calendar snapshot to screen state (month timeline + year grid).
 * React runs functional updaters synchronously when scheduling state — flags are reliable here.
 * @module lib/calendar/applyMoodCalendarSnapshot
 */
/** @returns true when month map or mood style reference changed. */
export function applyMoodCalendarSnapshot({ snapshot: { byMonthKey, calendarMoodStyle: nextStyle }, setEntriesByMonthKey, setCalendarMoodStyle, entriesRevisionRef, onMutated, }) {
    let entriesChanged = false;
    let styleChanged = false;
    setEntriesByMonthKey((prev) => {
        if (prev === byMonthKey)
            return prev;
        entriesRevisionRef.current += 1;
        entriesChanged = true;
        return byMonthKey;
    });
    setCalendarMoodStyle((prev) => {
        if (prev === nextStyle)
            return prev;
        styleChanged = true;
        return nextStyle;
    });
    const changed = entriesChanged || styleChanged;
    if (changed)
        onMutated?.();
    return changed;
}
