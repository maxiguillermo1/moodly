import { fillLocalWeekdaysForMonthDays1to31, localWeekdayForMonthDay } from './localWeekday';
describe('localWeekdayForMonthDay', () => {
    it('matches Date#getDay for each day in November 2026', () => {
        const y = 2026;
        const m = 10; // November
        for (let d = 1; d <= 30; d++) {
            expect(localWeekdayForMonthDay(y, m, d)).toBe(new Date(y, m, d).getDay());
        }
    });
    it('matches Date#getDay across February (leap year)', () => {
        const y = 2024;
        const m = 1;
        const dim = new Date(y, m + 1, 0).getDate();
        for (let d = 1; d <= dim; d++) {
            expect(localWeekdayForMonthDay(y, m, d)).toBe(new Date(y, m, d).getDay());
        }
    });
});
describe('fillLocalWeekdaysForMonthDays1to31', () => {
    it('fills indices 1..31 consistently with localWeekdayForMonthDay', () => {
        const y = 2026;
        const m = 0;
        const out = new Array(32);
        out[0] = -1;
        fillLocalWeekdaysForMonthDays1to31(y, m, out);
        for (let d = 1; d <= 31; d++) {
            expect(out[d]).toBe(localWeekdayForMonthDay(y, m, d));
        }
    });
});
