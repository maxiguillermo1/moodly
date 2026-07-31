/**
 * @fileoverview Mood grade ordering for soft correlations (local-first, deterministic).
 * @module lib/insights/moodOrdinal
 */
const ORDER = ['A+', 'A', 'B', 'C', 'D', 'F'];
const rankByGrade = ORDER.reduce((acc, g, i) => {
    acc[g] = i;
    return acc;
}, {});
export function moodGradeRank(grade) {
    if (!grade)
        return null;
    const r = rankByGrade[grade];
    return typeof r === 'number' ? r : null;
}
/** `true` when both ranks exist and `a` is strictly better (smaller rank index). */
export function isStrictlyBetterMood(a, b) {
    const ra = moodGradeRank(a);
    const rb = moodGradeRank(b);
    if (ra == null || rb == null)
        return false;
    return ra < rb;
}
/** Mood at least “B” (inclusive) — gentle high band for co-occurrence copy. */
export function isMoodAtLeastB(grade) {
    const r = moodGradeRank(grade);
    if (r == null)
        return false;
    return r <= rankByGrade.B;
}
