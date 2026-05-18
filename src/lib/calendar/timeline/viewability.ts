/**
 * @fileoverview Pure helpers: rank visible rows and derive dominant month + edge intent.
 * @module lib/calendar/timeline/viewability
 */

import type { MonthItem } from '../monthWindow';

export type MonthViewabilityRow = {
  item: MonthItem;
  index: number;
  isViewable?: boolean;
};

export function rankMonthViewables(
  viewableItems: Array<{ item: MonthItem; index: number | null; isViewable?: boolean }>
): MonthViewabilityRow[] {
  return viewableItems
    .filter((v): v is MonthViewabilityRow =>
      v.isViewable !== false && typeof v.index === 'number' && v.item != null
    )
    .sort((a, b) => a.index - b.index);
}

export function dominantMonthFromRanked(
  ranked: MonthViewabilityRow[]
): { midItem: MonthItem; firstIndex: number } | null {
  if (ranked.length === 0) return null;
  const first = ranked[0]!;
  const mid = ranked[Math.floor((ranked.length - 1) / 2)]!;
  return { midItem: mid.item, firstIndex: first.index };
}

export function timelinePendingWindowEdge(
  firstVisibleIndex: number,
  monthsLength: number,
  nearEdge: number
): 'start' | 'end' | null {
  if (firstVisibleIndex <= nearEdge) return 'start';
  if (firstVisibleIndex >= monthsLength - 1 - nearEdge) return 'end';
  return null;
}
