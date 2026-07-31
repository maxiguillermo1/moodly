/**
 * @fileoverview Calendar month matrix builder + cache (42 cells / 6 weeks)
 * @module lib/calendar/monthMatrix
 */
import { setWithLruEvict, touchLruMapKey } from '../utils/lruMap';
const cache = new Map();
const MONTH_MATRIX_CACHE_MAX = 768;
export function getMonthMatrix(year, monthIndex0) {
    const key = `${year}-${monthIndex0}`;
    const cached = cache.get(key);
    if (cached) {
        touchLruMapKey(cache, key);
        return cached;
    }
    const firstDow = new Date(year, monthIndex0, 1).getDay(); // 0..6 (Sun..Sat)
    const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++)
        cells.push(null);
    for (let d = 1; d <= daysInMonth; d++)
        cells.push(d);
    while (cells.length % 7 !== 0)
        cells.push(null);
    while (cells.length < 42)
        cells.push(null);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
        // Freeze for safety (shared cache), but cast back to mutable type for TS compatibility.
        weeks.push(Object.freeze(cells.slice(i, i + 7)));
    }
    const frozen = Object.freeze(weeks);
    setWithLruEvict(cache, key, frozen, MONTH_MATRIX_CACHE_MAX);
    return frozen;
}
