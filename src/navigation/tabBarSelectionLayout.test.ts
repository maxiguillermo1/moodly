/**
 * @fileoverview Unit tests for tab bar selection pill geometry.
 */

import {
  computeAllTabSelectionLayouts,
  computeTabSelectionLayout,
  TAB_SELECTION_SYM_W,
} from './tabBarSelectionLayout';

describe('tabBarSelectionLayout', () => {
  const minStadium = 44;

  it('returns symmetric layouts for three tabs', () => {
    const layouts = computeAllTabSelectionLayouts(300, 3, minStadium);
    expect(layouts).toHaveLength(3);
    expect(layouts[0]!.x).toBe(0);
    expect(layouts[2]!.x + layouts[2]!.w).toBeCloseTo(300, 5);
  });

  it('matches single-tab full-width stadium', () => {
    const layout = computeTabSelectionLayout({
      trackInnerW: 240,
      nTabs: 1,
      index: 0,
      minStadiumW: minStadium,
    });
    expect(layout.x).toBe(0);
    expect(layout.w).toBe(240);
  });

  it('middle tab pill stays inside track bounds', () => {
    const layout = computeTabSelectionLayout({
      trackInnerW: 280,
      nTabs: 3,
      index: 1,
      minStadiumW: minStadium,
      symW: TAB_SELECTION_SYM_W,
    });
    expect(layout.x).toBeGreaterThanOrEqual(0);
    expect(layout.x + layout.w).toBeLessThanOrEqual(280);
    expect(layout.w).toBeGreaterThanOrEqual(minStadium);
  });
});
