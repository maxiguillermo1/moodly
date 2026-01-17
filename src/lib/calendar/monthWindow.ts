/**
 * @fileoverview Calendar month window helpers (bounded timeline).
 */

export type MonthItem = { y: number; m: number; key: string };

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function monthKey(y: number, m: number) {
  return `${y}-${pad2(m + 1)}`;
}

export function monthItemFrom(anchor: Date, offsetMonths: number): MonthItem {
  const d = new Date(anchor.getFullYear(), anchor.getMonth() + offsetMonths, 1);
  return { y: d.getFullYear(), m: d.getMonth(), key: monthKey(d.getFullYear(), d.getMonth()) };
}

export function buildMonthWindow(anchor: Date, startOffset: number, endOffset: number): MonthItem[] {
  const out: MonthItem[] = [];
  for (let i = startOffset; i <= endOffset; i++) out.push(monthItemFrom(anchor, i));
  return out;
}

export function clampWindow(
  startOffset: number,
  endOffset: number,
  cap: number
): { startOffset: number; endOffset: number; trimmedFromStart: number; trimmedFromEnd: number } {
  const len = endOffset - startOffset + 1;
  if (len <= cap) return { startOffset, endOffset, trimmedFromStart: 0, trimmedFromEnd: 0 };

  const extra = len - cap;
  // Default behavior: trim from the opposite side of growth at call-site.
  // This helper is mainly used after shifting one side; call-site decides which side to trim.
  return { startOffset, endOffset, trimmedFromStart: 0, trimmedFromEnd: extra };
}

