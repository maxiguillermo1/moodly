import { msUntilNextLocalMidnight, toLocalDayKey } from './date';

describe('toLocalDayKey', () => {
  it('uses local calendar components (YYYY-MM-DD)', () => {
    const d = new Date(2026, 1, 9, 12, 34, 56); // Feb 9, 2026 local
    expect(toLocalDayKey(d)).toBe('2026-02-09');
  });

  it('is stable within the same local day (DST-safe by construction)', () => {
    const a = new Date(2026, 2, 8, 0, 30, 0); // Mar 8, 2026
    const b = new Date(2026, 2, 8, 23, 30, 0);
    expect(toLocalDayKey(a)).toBe(toLocalDayKey(b));
  });
});

describe('msUntilNextLocalMidnight', () => {
  it('returns a positive delay', () => {
    const now = new Date(2026, 1, 9, 12, 0, 0);
    expect(msUntilNextLocalMidnight(now)).toBeGreaterThan(0);
  });

  it('matches next local midnight boundary (no polling)', () => {
    const now = new Date(2026, 1, 9, 23, 59, 0, 0);
    const ms = msUntilNextLocalMidnight(now);
    const next = new Date(now.getTime() + ms);
    expect(next.getHours()).toBe(0);
    expect(next.getMinutes()).toBe(0);
  });

  it('works on DST transition days (environment TZ is set by test script)', () => {
    // These assertions are intentionally coarse: we only require positivity and boundary correctness.
    const now = new Date(2026, 2, 8, 1, 30, 0); // typical US DST start date
    const ms = msUntilNextLocalMidnight(now);
    expect(ms).toBeGreaterThan(0);
    const next = new Date(now.getTime() + ms);
    expect(toLocalDayKey(next)).not.toBe(toLocalDayKey(now));
  });
});

