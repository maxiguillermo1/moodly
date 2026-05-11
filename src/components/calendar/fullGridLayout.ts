/**
 * @fileoverview Full month grid: equal column gap and row gap + scaled day cell metrics.
 * @module components/calendar/fullGridLayout
 */

const BASE_CELL = 44;
/** Slightly smaller day “pills” than the legacy 44px baseline. */
export const FULL_GRID_TARGET_CELL = 38;
const MIN_GAP = 4;

export type FullGridMetrics = {
  cell: number;
  gap: number;
  fontSize: number;
  lineHeight: number;
  dotSize: number;
  dotMarginTop: number;
  todayRingW: number;
  dotPadTop: number;
  dotPadBottom: number;
};

/**
 * Fit 7 cells and 6 gaps into `width` (must be the **inner** width available to the grid, after padding).
 * Guarantees `7 * cell + 6 * gap <= floor(width)` so the row never spills past the card.
 */
export function computeFullCalendarGridLayout(width: number): { cell: number; gap: number } {
  if (!Number.isFinite(width) || width <= 0) {
    return { cell: FULL_GRID_TARGET_CELL, gap: 8 };
  }
  const w = Math.floor(width);
  let cell = FULL_GRID_TARGET_CELL;
  let gap = Math.floor((w - 7 * cell) / 6);

  if (gap < MIN_GAP) {
    gap = MIN_GAP;
    cell = Math.floor((w - 6 * gap) / 7);
  }

  cell = Math.max(26, cell);

  while (7 * cell + 6 * gap > w && gap > MIN_GAP) {
    gap -= 1;
  }
  while (7 * cell + 6 * gap > w && cell > 26) {
    cell -= 1;
  }

  if (7 * cell + 6 * gap > w) {
    gap = MIN_GAP;
    cell = Math.max(24, Math.floor((w - 6 * gap) / 7));
    gap = Math.max(MIN_GAP, Math.floor((w - 7 * cell) / 6));
    while (7 * cell + 6 * gap > w && cell > 22) {
      cell -= 1;
    }
  }

  if (7 * cell + 6 * gap > w) {
    gap = Math.max(0, Math.floor((w - 7 * cell) / 6));
  }
  if (gap < MIN_GAP) {
    gap = MIN_GAP;
    cell = Math.max(22, Math.floor((w - 6 * gap) / 7));
  }

  while (7 * cell + 6 * gap > w && cell > 20) {
    cell -= 1;
    gap = Math.max(MIN_GAP, Math.floor((w - 7 * cell) / 6));
  }

  return { cell, gap };
}

export function buildFullGridMetrics(contentWidth: number): FullGridMetrics {
  const { cell, gap } = computeFullCalendarGridLayout(contentWidth);
  const scale = cell / BASE_CELL;
  const fontSize = Mround(17 * scale);
  let lineHeight = Mround(22 * scale);
  let dotSize = Math.max(2, Math.round(2 * scale));
  let dotMarginTop = Math.max(1, Math.round(1.5 * scale));
  const todayRingW = Math.max(2, Math.round(2 * scale));
  let dotPadTop = Math.round(8 * scale);
  let dotPadBottom = Math.round(9 * scale);

  // Dot-mode stack must not exceed cell height (avoids clipping / overflow).
  while (dotPadTop + lineHeight + dotMarginTop + dotSize + dotPadBottom > cell) {
    if (dotPadBottom > 2) {
      dotPadBottom -= 1;
    } else if (dotPadTop > 2) {
      dotPadTop -= 1;
    } else if (lineHeight > fontSize + 1) {
      lineHeight = Mround(lineHeight - 0.5);
    } else if (dotMarginTop > 1) {
      dotMarginTop -= 1;
    } else if (dotSize > 2) {
      dotSize -= 1;
    } else {
      break;
    }
  }

  return {
    cell,
    gap,
    fontSize,
    lineHeight,
    dotSize,
    dotMarginTop,
    todayRingW,
    dotPadTop,
    dotPadBottom,
  };
}

function Mround(n: number): number {
  return Math.round(n * 10) / 10;
}
