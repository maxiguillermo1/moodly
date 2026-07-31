/**
 * @fileoverview Plug-in registry for day extensions (add new slots by appending a plugin).
 * @module extensions/dayExtensionRegistry
 */
import { DEFAULT_TODAY_EXTENSIONS_STACK_ORDER } from '../types';
import { GoalsExtensionSlot, HabitsExtensionSlot, TodoExtensionSlot, } from './dayExtensionSlots';
export const DAY_EXTENSION_PLUGINS = [
    { id: 'habits', isPolicyActive: (p) => p.habitsEnabled, Slot: HabitsExtensionSlot },
    { id: 'goals', isPolicyActive: (p) => p.todayGoalsEnabled, Slot: GoalsExtensionSlot },
    { id: 'todo', isPolicyActive: (p) => p.todayTodoEnabled, Slot: TodoExtensionSlot },
];
const PLUGIN_BY_ID = {
    habits: DAY_EXTENSION_PLUGINS[0],
    goals: DAY_EXTENSION_PLUGINS[1],
    todo: DAY_EXTENSION_PLUGINS[2],
};
/**
 * User ordering first, then any active plugins missing from the saved permutation (catalog order).
 * Matches legacy {@link TodayExtensionsPanel} ordering rules.
 */
export function orderedActiveExtensionPlugins(policy) {
    const out = [];
    const seen = new Set();
    for (const id of policy.todayExtensionsOrder) {
        const plugin = PLUGIN_BY_ID[id];
        if (!plugin.isPolicyActive(policy))
            continue;
        out.push(plugin);
        seen.add(id);
    }
    for (const id of DEFAULT_TODAY_EXTENSIONS_STACK_ORDER) {
        if (seen.has(id))
            continue;
        const plugin = PLUGIN_BY_ID[id];
        if (!plugin.isPolicyActive(policy))
            continue;
        out.push(plugin);
        seen.add(id);
    }
    return out;
}
