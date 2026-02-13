/**
 * @fileoverview Calendar month matrix builder + cache (42 cells / 6 weeks)
 * @module lib/calendar/monthMatrix
 */

/**
 * Month matrix shape: 6 rows × 7 columns of day numbers. Empty cells are null.
 * This matches the compact iOS year view style (blank padding, not adjacent-month days).
 */
export type MonthMatrix = (number | null)[][];

const cache = new Map<string, MonthMatrix>();

export function getMonthMatrix(year: number, monthIndex0: number): MonthMatrix {
  const key = `${year}-${monthIndex0}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const firstDow = new Date(year, monthIndex0, 1).getDay(); // 0..6 (Sun..Sat)
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);

  const weeks: MonthMatrix = [];
  for (let i = 0; i < cells.length; i += 7) {
    // Freeze for safety (shared cache), but cast back to mutable type for TS compatibility.
    weeks.push(Object.freeze(cells.slice(i, i + 7)) as any);
  }

  const frozen = Object.freeze(weeks) as any as MonthMatrix;
  cache.set(key, frozen);
  return frozen;
}

