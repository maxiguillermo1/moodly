/**
 * @fileoverview When to force-refresh virtualized calendar cells (policy only; no React).
 * @module lib/calendar/recycleEpochPolicy
 */
/**
 * User left the screen before local midnight and returned after — "today" must refresh.
 */
export function didLocalTodayChangeAcrossBlur(todayWhenBlurred, todayNow) {
    return todayWhenBlurred != null && todayWhenBlurred !== todayNow;
}
