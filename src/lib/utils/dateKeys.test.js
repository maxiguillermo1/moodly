import { dayOfMonthInCalendarMonth, isValidLocalDayKeyFormat, monthKeyFromLocalDayKey, localDayKeyFromParts, } from './dateKeys';
describe('dateKeys', () => {
    it('monthKeyFromLocalDayKey returns YYYY-MM', () => {
        expect(monthKeyFromLocalDayKey('2026-03-15')).toBe('2026-03');
    });
    it('isValidLocalDayKeyFormat rejects bad shapes', () => {
        expect(isValidLocalDayKeyFormat('2026-3-15')).toBe(false);
        expect(isValidLocalDayKeyFormat('2026-03-5')).toBe(false);
        expect(isValidLocalDayKeyFormat('2026-03-15')).toBe(true);
    });
    it('dayOfMonthInCalendarMonth matches only same calendar month', () => {
        expect(dayOfMonthInCalendarMonth('2026-01-31', 2026, 0)).toBe(31);
        expect(dayOfMonthInCalendarMonth('2026-02-01', 2026, 0)).toBe(0);
        expect(dayOfMonthInCalendarMonth('2026-02-01', 2026, 1)).toBe(1);
    });
    it('localDayKeyFromParts is stable for year boundaries', () => {
        expect(localDayKeyFromParts(2025, 11, 31)).toBe('2025-12-31');
        expect(localDayKeyFromParts(2024, 1, 29)).toBe('2024-02-29');
    });
});
