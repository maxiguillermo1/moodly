import { toLocalDayKey, parseISODate, formatDateForDisplay, isValidLocalCalendarDayKey, coerceLocalDayKeyOrToday, msUntilNextLocalMidnight, } from './date';
describe('toLocalDayKey / local calendar semantics', () => {
    it('uses local components not UTC', () => {
        const d = new Date(2026, 0, 15, 23, 59, 59);
        expect(toLocalDayKey(d)).toBe('2026-01-15');
    });
    it('parseISODate round-trips local day', () => {
        const key = '2028-12-31';
        expect(toLocalDayKey(parseISODate(key))).toBe(key);
    });
    it('parseISODate rejects invalid format and nonexistent calendar days', () => {
        expect(Number.isNaN(parseISODate('').getTime())).toBe(true);
        expect(Number.isNaN(parseISODate('2026-13-01').getTime())).toBe(true);
        expect(Number.isNaN(parseISODate('2026-02-30').getTime())).toBe(true);
        expect(Number.isNaN(parseISODate('bad').getTime())).toBe(true);
    });
    it('isValidLocalCalendarDayKey matches parseISODate validity (leap year)', () => {
        expect(isValidLocalCalendarDayKey('2024-02-29')).toBe(true);
        expect(isValidLocalCalendarDayKey('2025-02-29')).toBe(false);
        expect(isValidLocalCalendarDayKey('2026-01-01')).toBe(true);
        expect(isValidLocalCalendarDayKey('not-a-date')).toBe(false);
    });
    it('coerceLocalDayKeyOrToday rejects bad params', () => {
        expect(coerceLocalDayKeyOrToday('2026-03-15')).toBe('2026-03-15');
        expect(isValidLocalCalendarDayKey(coerceLocalDayKeyOrToday('2026-02-31'))).toBe(true);
        expect(isValidLocalCalendarDayKey(coerceLocalDayKeyOrToday(null))).toBe(true);
        expect(isValidLocalCalendarDayKey(coerceLocalDayKeyOrToday(123))).toBe(true);
    });
    it('formatDateForDisplay falls back safely for corrupt keys', () => {
        expect(formatDateForDisplay('2026-02-30')).toBe('2026-02-30');
        expect(formatDateForDisplay('   ')).toBe('—');
    });
    it('keeps local day keys stable across DST transition dates', () => {
        expect(toLocalDayKey(new Date(2026, 2, 8, 1, 30))).toBe('2026-03-08');
        expect(toLocalDayKey(new Date(2026, 2, 8, 3, 30))).toBe('2026-03-08');
        expect(toLocalDayKey(new Date(2026, 10, 1, 1, 30))).toBe('2026-11-01');
        expect(toLocalDayKey(new Date(2026, 10, 1, 23, 30))).toBe('2026-11-01');
    });
    it('computes next local midnight through DST and year boundaries', () => {
        expect(msUntilNextLocalMidnight(new Date(2026, 11, 31, 23, 59, 59, 500))).toBe(500);
        expect(msUntilNextLocalMidnight(new Date(2026, 2, 8, 12, 0, 0, 0))).toBeGreaterThan(0);
        expect(msUntilNextLocalMidnight(new Date(2026, 10, 1, 12, 0, 0, 0))).toBeGreaterThan(0);
    });
});
