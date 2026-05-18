import { getMonthMatrix } from './monthMatrix';

describe('getMonthMatrix', () => {
  it('caches stable references per year/month', () => {
    const a = getMonthMatrix(2026, 0);
    const b = getMonthMatrix(2026, 0);
    expect(a).toBe(b);
  });

  it('January 2026 starts on Thursday (4) with 31 days → 6 padded week rows (42 cells)', () => {
    const weeks = getMonthMatrix(2026, 0);
    expect(weeks).toHaveLength(6);
    expect(weeks[0][0]).toBeNull();
    expect(weeks[0][1]).toBeNull();
    expect(weeks[0][2]).toBeNull();
    expect(weeks[0][3]).toBeNull();
    expect(weeks[0][4]).toBe(1);
    expect(weeks[4][6]).toBe(31);
  });

  it('February 2024 (leap) has 29 days ending on Thursday row', () => {
    const weeks = getMonthMatrix(2024, 1);
    const flat = weeks.flat().filter((x) => x != null) as number[];
    expect(flat).toHaveLength(29);
    expect(Math.max(...flat)).toBe(29);
  });

  it('pads to full weeks with trailing nulls (42 cells)', () => {
    const weeks = getMonthMatrix(2026, 1);
    const cells = weeks.flat();
    expect(cells).toHaveLength(42);
    expect(cells.filter((c) => c == null).length).toBeGreaterThan(0);
  });
});
