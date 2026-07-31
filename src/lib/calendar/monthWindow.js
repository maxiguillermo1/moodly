/**
 * @fileoverview Calendar month window helpers (bounded timeline).
 */
function pad2(n) {
    return String(n).padStart(2, '0');
}
export function monthKey(y, m) {
    return `${y}-${pad2(m + 1)}`;
}
export function monthItemFrom(anchor, offsetMonths) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() + offsetMonths, 1);
    return { y: d.getFullYear(), m: d.getMonth(), key: monthKey(d.getFullYear(), d.getMonth()) };
}
export function buildMonthWindow(anchor, startOffset, endOffset) {
    const out = [];
    for (let i = startOffset; i <= endOffset; i++)
        out.push(monthItemFrom(anchor, i));
    return out;
}
export function clampWindow(startOffset, endOffset, cap) {
    const len = endOffset - startOffset + 1;
    if (len <= cap)
        return { startOffset, endOffset, trimmedFromStart: 0, trimmedFromEnd: 0 };
    const extra = len - cap;
    // Default behavior: trim from the opposite side of growth at call-site.
    // This helper is mainly used after shifting one side; call-site decides which side to trim.
    return { startOffset, endOffset, trimmedFromStart: 0, trimmedFromEnd: extra };
}
