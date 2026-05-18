import { didLocalTodayChangeAcrossBlur } from './recycleEpochPolicy';

describe('didLocalTodayChangeAcrossBlur', () => {
  it('is false when there was no prior blur snapshot (first mount)', () => {
    expect(didLocalTodayChangeAcrossBlur(null, '2026-05-11')).toBe(false);
  });

  it('is false when today is unchanged', () => {
    expect(didLocalTodayChangeAcrossBlur('2026-05-11', '2026-05-11')).toBe(false);
  });

  it('is true when today moved forward across blur', () => {
    expect(didLocalTodayChangeAcrossBlur('2026-05-10', '2026-05-11')).toBe(true);
  });
});
