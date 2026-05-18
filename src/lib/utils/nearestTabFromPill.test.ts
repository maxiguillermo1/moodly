/**
 * @fileoverview Unit tests for tab index from pill geometry (hot-path logic for FloatingTabBar).
 */

import { nearestTabFromPillCenter } from './nearestTabFromPill';

describe('nearestTabFromPillCenter', () => {
  const pad = 0;
  const gap = 0;

  it('returns 0 when pill is over the first slot center', () => {
    const trackW = 300;
    const n = 3;
    const slotW = trackW / n;
    const cx0 = pad + slotW * 0.5;
    const pillW = 40;
    const pillX = cx0 - pillW * 0.5;
    expect(nearestTabFromPillCenter(pillX, pillW, trackW, n, pad, gap)).toBe(0);
  });

  it('returns 1 when pill center is closest to middle slot', () => {
    const trackW = 300;
    const n = 3;
    const slotW = trackW / n;
    const cx1 = pad + slotW + slotW * 0.5;
    const pillW = 44;
    const pillX = cx1 - pillW * 0.5;
    expect(nearestTabFromPillCenter(pillX, pillW, trackW, n, pad, gap)).toBe(1);
  });

  it('returns last index when pill center is over the last slot', () => {
    const trackInner = 300;
    const n = 3;
    const pad = 0;
    const trackW = trackInner - 2 * pad;
    const slotW = (trackW - (n - 1) * gap) / n;
    const cx2 = pad + 2 * (slotW + gap) + slotW * 0.5;
    const pillW = 50;
    const pillX = cx2 - pillW * 0.5;
    expect(nearestTabFromPillCenter(pillX, pillW, trackInner, n, pad, gap)).toBe(2);
  });

  it('handles track padding', () => {
    const trackInner = 200;
    const padH = 4;
    const n = 2;
    const trackW = trackInner - 2 * padH;
    const slotW = (trackW - gap) / n;
    const cx0 = padH + slotW * 0.5;
    const pillW = 36;
    const pillX = cx0 - pillW * 0.5;
    expect(nearestTabFromPillCenter(pillX, pillW, trackInner, n, padH, gap)).toBe(0);
  });
});
