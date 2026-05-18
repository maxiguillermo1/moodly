/**
 * @fileoverview Plug-in registry for day extensions (add new slots by appending a plugin).
 * @module extensions/dayExtensionRegistry
 */

import type { ComponentType } from 'react';

import type { TodayExtensionStackId } from '../types';
import { DEFAULT_TODAY_EXTENSIONS_STACK_ORDER } from '../types';
import type { ExtensionsPolicy } from '../theme/ExtensionsPolicyContext';

import {
  GoalsExtensionSlot,
  HabitsExtensionSlot,
  TodoExtensionSlot,
  type DayExtensionSlotProps,
} from './dayExtensionSlots';

export type DayExtensionPlugin = {
  id: TodayExtensionStackId;
  /** Settings-only gate; a mounted slot may still render nothing (e.g. empty habits strip). */
  isPolicyActive: (policy: ExtensionsPolicy) => boolean;
  Slot: ComponentType<DayExtensionSlotProps>;
};

export const DAY_EXTENSION_PLUGINS: readonly DayExtensionPlugin[] = [
  { id: 'habits', isPolicyActive: (p) => p.habitsEnabled, Slot: HabitsExtensionSlot },
  { id: 'goals', isPolicyActive: (p) => p.todayGoalsEnabled, Slot: GoalsExtensionSlot },
  { id: 'todo', isPolicyActive: (p) => p.todayTodoEnabled, Slot: TodoExtensionSlot },
];

const PLUGIN_BY_ID: Record<TodayExtensionStackId, DayExtensionPlugin> = {
  habits: DAY_EXTENSION_PLUGINS[0],
  goals: DAY_EXTENSION_PLUGINS[1],
  todo: DAY_EXTENSION_PLUGINS[2],
};

/**
 * User ordering first, then any active plugins missing from the saved permutation (catalog order).
 * Matches legacy {@link TodayExtensionsPanel} ordering rules.
 */
export function orderedActiveExtensionPlugins(policy: ExtensionsPolicy): DayExtensionPlugin[] {
  const out: DayExtensionPlugin[] = [];
  const seen = new Set<TodayExtensionStackId>();

  for (const id of policy.todayExtensionsOrder) {
    const plugin = PLUGIN_BY_ID[id];
    if (!plugin.isPolicyActive(policy)) continue;
    out.push(plugin);
    seen.add(id);
  }

  for (const id of DEFAULT_TODAY_EXTENSIONS_STACK_ORDER) {
    if (seen.has(id)) continue;
    const plugin = PLUGIN_BY_ID[id];
    if (!plugin.isPolicyActive(policy)) continue;
    out.push(plugin);
    seen.add(id);
  }

  return out;
}
