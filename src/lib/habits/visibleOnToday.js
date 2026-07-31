/**
 * @fileoverview Which habits appear on the Today extension strip (pure helpers).
 * @module lib/habits/visibleOnToday
 */
import { HABIT_CATALOG } from '../constants/habitsCatalog';
export function catalogHabitsForTodayStrip(tracked) {
    return HABIT_CATALOG.filter((h) => tracked.has(h.id));
}
export function shouldRenderTodayHabitStrip(habitsEnabled, tracked) {
    return habitsEnabled === true && tracked.size > 0;
}
