import {
  CALENDAR_MONTH_WINDOW_CAP,
  CALENDAR_MONTH_WINDOW_EXTEND,
  computeMonthWindowExtension,
} from './monthTimelineWindow';

describe('computeMonthWindowExtension', () => {
  it('extends start and shifts recenter index forward', () => {
    const r = computeMonthWindowExtension({ start: -10, end: 10 }, 'start', 5);
    expect(r.offsets.start).toBe(-10 - CALENDAR_MONTH_WINDOW_EXTEND);
    expect(r.recenterIndex).toBe(5 + CALENDAR_MONTH_WINDOW_EXTEND);
    expect(r.didMutate).toBe(true);
  });

  it('extends end and trims start when over cap', () => {
    const wide = { start: -500, end: 500 };
    const r = computeMonthWindowExtension(wide, 'end', 400);
    const len = r.offsets.end - r.offsets.start + 1;
    expect(len).toBeLessThanOrEqual(CALENDAR_MONTH_WINDOW_CAP);
    expect(r.didMutate).toBe(true);
  });

  it('returns didMutate false when offsets unchanged', () => {
    const current = { start: 0, end: 0 };
    const r = computeMonthWindowExtension(current, 'end', 0, { extendBy: 0 });
    expect(r.didMutate).toBe(false);
  });
});
