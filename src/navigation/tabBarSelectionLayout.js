/**
 * @fileoverview Selection pill geometry for FloatingTabBar (unit-tested hot path).
 * @module navigation/tabBarSelectionLayout
 */
/** Horizontal padding inside selection pill around icon (tight fit). */
export const TAB_SELECTION_ICON_SIZE = 18;
export const TAB_SELECTION_PILL_PAD_H = 7;
export const TAB_SELECTION_SYM_W = TAB_SELECTION_ICON_SIZE + TAB_SELECTION_PILL_PAD_H * 2;
export const TAB_SELECTION_TRACK_PAD_H = 0;
export const TAB_SELECTION_SLOT_GAP = 0;
/**
 * Positions the selection so end tabs flush to the inner track edge; middle tabs fill each slot.
 */
export function computeTabSelectionLayout(params) {
    const symW = params.symW ?? TAB_SELECTION_SYM_W;
    const { minStadiumW } = params;
    const { trackInnerW, nTabs, index } = params;
    if (trackInnerW <= 0 || nTabs <= 0)
        return { x: 0, w: symW };
    const trackW = Math.max(0, trackInnerW - 2 * TAB_SELECTION_TRACK_PAD_H);
    const slotW = (trackW - (nTabs - 1) * TAB_SELECTION_SLOT_GAP) / nTabs;
    const slotStart = (i) => TAB_SELECTION_TRACK_PAD_H + i * (slotW + TAB_SELECTION_SLOT_GAP);
    const cx = slotStart(index) + slotW / 2;
    const rightInner = TAB_SELECTION_TRACK_PAD_H + trackW;
    if (nTabs === 1) {
        return { x: 0, w: Math.max(minStadiumW, trackInnerW) };
    }
    if (index === 0) {
        const w = Math.min(rightInner, Math.max(minStadiumW, symW, 2 * cx));
        return { x: 0, w };
    }
    if (index === nTabs - 1) {
        let w = Math.max(minStadiumW, symW, 2 * (rightInner - cx));
        let x = rightInner - w;
        if (x < TAB_SELECTION_TRACK_PAD_H) {
            x = TAB_SELECTION_TRACK_PAD_H;
            w = rightInner - x;
        }
        return { x, w };
    }
    const slotLeft = slotStart(index);
    const inset = 2;
    const wCap = slotW - inset * 2;
    let w = Math.max(minStadiumW, symW, wCap);
    if (w > wCap)
        w = wCap;
    let x = cx - w / 2;
    x = Math.max(slotLeft + inset, Math.min(x, slotLeft + slotW - w - inset));
    x = Math.max(TAB_SELECTION_TRACK_PAD_H, Math.min(x, rightInner - w));
    return { x, w };
}
/** Precompute pill x/w for every tab index at a fixed track width. */
export function computeAllTabSelectionLayouts(trackInnerW, nTabs, minStadiumW) {
    if (trackInnerW <= 0 || nTabs <= 0)
        return [];
    return Array.from({ length: nTabs }, (_, index) => computeTabSelectionLayout({ trackInnerW, nTabs, index, minStadiumW }));
}
