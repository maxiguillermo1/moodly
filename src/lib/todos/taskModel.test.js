/**
 * @fileoverview Tests for task recurrence helpers.
 * @module lib/todos/taskModel.test
 */
import { nextRecurrenceDate } from './taskModel';
function monthly(interval, startDate, endDate = null) {
    return {
        id: 'm',
        frequency: 'monthly',
        interval,
        startDate,
        endDate,
        weekdays: [],
        lastGeneratedDate: null,
    };
}
describe('nextRecurrenceDate', () => {
    it('clamps Jan 31 + 1 month to Feb last day (non-leap)', () => {
        const r = monthly(1, '2025-01-31', null);
        expect(nextRecurrenceDate(r, '2025-01-31')).toBe('2025-02-28');
    });
    it('Jan 31 + 1 month in leap year clamps to Feb 29', () => {
        const r = monthly(1, '2024-01-31', null);
        expect(nextRecurrenceDate(r, '2024-01-31')).toBe('2024-02-29');
    });
    it('returns null when next occurrence is past endDate', () => {
        const r = monthly(1, '2025-01-10', '2025-01-15');
        expect(nextRecurrenceDate(r, '2025-01-15')).toBeNull();
    });
    it('advances daily by interval using local calendar days', () => {
        const r = {
            id: 'd',
            frequency: 'daily',
            interval: 3,
            startDate: '2025-06-01',
            endDate: null,
            weekdays: [],
            lastGeneratedDate: null,
        };
        expect(nextRecurrenceDate(r, '2025-06-01')).toBe('2025-06-04');
    });
    it('skips Sat/Sun for weekdays frequency', () => {
        const r = {
            id: 'w',
            frequency: 'weekdays',
            interval: 1,
            startDate: '2025-06-06',
            endDate: null,
            weekdays: [],
            lastGeneratedDate: null,
        };
        // Friday 2025-06-06 → next weekday is Mon 2025-06-09
        expect(nextRecurrenceDate(r, '2025-06-06')).toBe('2025-06-09');
    });
    it('returns null for invalid fromDate', () => {
        const r = monthly(1, '2025-01-01', null);
        expect(nextRecurrenceDate(r, 'not-a-date')).toBeNull();
    });
    it('weekly with weekdays Mon+Wed: from Monday yields Wednesday', () => {
        const r = {
            id: 'w',
            frequency: 'weekly',
            interval: 1,
            startDate: '2025-06-02',
            endDate: null,
            weekdays: [1, 3],
            lastGeneratedDate: null,
        };
        expect(nextRecurrenceDate(r, '2025-06-02')).toBe('2025-06-04');
    });
    it('weekly interval 2 from Monday yields second Monday', () => {
        const r = {
            id: 'w2',
            frequency: 'weekly',
            interval: 2,
            startDate: '2025-06-02',
            endDate: null,
            weekdays: [1],
            lastGeneratedDate: null,
        };
        expect(nextRecurrenceDate(r, '2025-06-02')).toBe('2025-06-16');
    });
});
