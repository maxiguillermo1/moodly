/**
 * @fileoverview Which tab slot the selection pill center sits in (same math as FloatingTabBar).
 * @module lib/utils/nearestTabFromPill
 */

/**
 * Returns the tab index (0..nTabs-1) whose slot center is closest to the pill midpoint.
 * Used by the tab bar worklet and unit-tested for layout correctness.
 */
export function nearestTabFromPillCenter(
  pillX: number,
  pillW: number,
  trackInnerW: number,
  nTabs: number,
  trackPadH: number,
  slotGap: number
): number {
  'worklet';
  const tw = trackInnerW;
  const n = Math.max(1, Math.round(nTabs));
  if (tw <= 0) return 0;
  const trackW = tw - 2 * trackPadH;
  if (trackW <= 0) return 0;
  const slotW = (trackW - (n - 1) * slotGap) / n;
  const center = pillX + pillW * 0.5;
  let best = 0;
  let bestD = 1e9;
  for (let i = 0; i < n; i++) {
    const slotStart = trackPadH + i * (slotW + slotGap);
    const slotCx = slotStart + slotW * 0.5;
    const d = Math.abs(center - slotCx);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
