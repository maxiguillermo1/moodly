/**
 * @fileoverview Which habits appear on the Today extension strip (pure helpers).
 * @module lib/habits/visibleOnToday
 */

import { HABIT_CATALOG, type HabitDefinition, type HabitId } from '../constants/habitsCatalog';

export function catalogHabitsForTodayStrip(tracked: ReadonlySet<HabitId>): HabitDefinition[] {
  return HABIT_CATALOG.filter((h) => tracked.has(h.id));
}

export function shouldRenderTodayHabitStrip(habitsEnabled: boolean, tracked: ReadonlySet<HabitId>): boolean {
  return habitsEnabled === true && tracked.size > 0;
}
