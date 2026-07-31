/**
 * @fileoverview Pure helpers: rank visible rows and derive dominant month + edge intent.
 * @module lib/calendar/timeline/viewability
 */
export function rankMonthViewables(viewableItems) {
    return viewableItems
        .filter((v) => v.isViewable !== false && typeof v.index === 'number' && v.item != null)
        .sort((a, b) => a.index - b.index);
}
export function dominantMonthFromRanked(ranked) {
    if (ranked.length === 0)
        return null;
    const first = ranked[0];
    const mid = ranked[Math.floor((ranked.length - 1) / 2)];
    return { midItem: mid.item, firstIndex: first.index };
}
export function timelinePendingWindowEdge(firstVisibleIndex, monthsLength, nearEdge) {
    if (firstVisibleIndex <= nearEdge)
        return 'start';
    if (firstVisibleIndex >= monthsLength - 1 - nearEdge)
        return 'end';
    return null;
}
