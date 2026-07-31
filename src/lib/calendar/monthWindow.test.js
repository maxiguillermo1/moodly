import { buildMonthWindow, monthItemFrom, monthKey } from './monthWindow';
describe('monthKey', () => {
    it('zero-pads month for YYYY-MM', () => {
        expect(monthKey(2026, 0)).toBe('2026-01');
        expect(monthKey(2026, 11)).toBe('2026-12');
    });
});
describe('monthItemFrom', () => {
    it('rolls year backward for negative offsets', () => {
        const anchor = new Date(2026, 0, 1);
        const prev = monthItemFrom(anchor, -1);
        expect(prev.y).toBe(2025);
        expect(prev.m).toBe(11);
        expect(prev.key).toBe('2025-12');
    });
    it('rolls year forward past December', () => {
        const anchor = new Date(2026, 11, 1);
        const next = monthItemFrom(anchor, 1);
        expect(next.y).toBe(2027);
        expect(next.m).toBe(0);
        expect(next.key).toBe('2027-01');
    });
});
describe('buildMonthWindow', () => {
    it('produces contiguous keys', () => {
        const anchor = new Date(2026, 5, 1);
        const win = buildMonthWindow(anchor, -1, 1);
        expect(win.map((x) => x.key)).toEqual(['2026-05', '2026-06', '2026-07']);
    });
});
