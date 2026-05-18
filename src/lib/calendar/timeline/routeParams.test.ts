import { readAnchorDateFromRouteParams, readInitialSelectedDayKeyFromRoute } from './routeParams';
import { isValidLocalCalendarDayKey } from '../../utils/date';

describe('readAnchorDateFromRouteParams', () => {
  it('uses year/month when finite and month in 0..11', () => {
    const d = readAnchorDateFromRouteParams({ year: 2026, month: 3 });
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(1);
  });

  it('falls back to first of current month when params missing', () => {
    const d = readAnchorDateFromRouteParams({});
    const now = new Date();
    expect(d.getFullYear()).toBe(now.getFullYear());
    expect(d.getMonth()).toBe(now.getMonth());
    expect(d.getDate()).toBe(1);
  });

  it('uses a valid date param as the anchor month when year/month are missing', () => {
    const d = readAnchorDateFromRouteParams({ date: '2028-02-29' });
    expect(d.getFullYear()).toBe(2028);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(1);
  });

  it('uses a valid date param as the anchor when year/month disagree', () => {
    const d = readAnchorDateFromRouteParams({ year: 2026, month: 2, date: '2028-02-29' });
    expect(d.getFullYear()).toBe(2028);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(1);
  });

  it('ignores non-numeric or out-of-range month', () => {
    const d = readAnchorDateFromRouteParams({ year: 2020, month: 12 });
    const now = new Date();
    expect(d.getFullYear()).toBe(now.getFullYear());
    expect(d.getMonth()).toBe(now.getMonth());
  });
});

describe('readInitialSelectedDayKeyFromRoute', () => {
  it('returns first of anchor month when route has valid year/month', () => {
    const anchor = new Date(2026, 2, 1);
    const key = readInitialSelectedDayKeyFromRoute({ year: 2026, month: 2 }, anchor);
    expect(key).toBe('2026-03-01');
    expect(isValidLocalCalendarDayKey(key)).toBe(true);
  });

  it('returns valid route date when provided', () => {
    const anchor = new Date(2026, 2, 1);
    const key = readInitialSelectedDayKeyFromRoute({ year: 2026, month: 2, date: '2026-03-24' }, anchor);
    expect(key).toBe('2026-03-24');
    expect(isValidLocalCalendarDayKey(key)).toBe(true);
  });

  it('ignores invalid route date and falls back to route month', () => {
    const anchor = new Date(2026, 2, 1);
    const key = readInitialSelectedDayKeyFromRoute({ year: 2026, month: 2, date: '2026-02-31' }, anchor);
    expect(key).toBe('2026-03-01');
  });

  it('returns today when route params invalid', () => {
    const anchor = readAnchorDateFromRouteParams({});
    const key = readInitialSelectedDayKeyFromRoute({ year: NaN, month: 0 }, anchor);
    expect(isValidLocalCalendarDayKey(key)).toBe(true);
  });
});
