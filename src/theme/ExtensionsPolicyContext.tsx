/**
 * @fileoverview Narrow settings slice for Today / day-editor extensions (stable memo boundary).
 * Keeps extension UI from coupling to the full {@link AppTheme} object for toggle/order state.
 * @module theme/ExtensionsPolicyContext
 */

import React, { createContext, useContext, type ReactNode } from 'react';

import type { TodayExtensionStackId } from '../types';

export type ExtensionsPolicy = {
  habitsEnabled: boolean;
  todayGoalsEnabled: boolean;
  todayTodoEnabled: boolean;
  todayExtensionsOrder: readonly TodayExtensionStackId[];
  bumpTodayExtensionStackOrder: (id: TodayExtensionStackId) => Promise<void>;
};

const Ctx = createContext<ExtensionsPolicy | null>(null);

const FALLBACK_POLICY: ExtensionsPolicy = {
  habitsEnabled: false,
  todayGoalsEnabled: false,
  todayTodoEnabled: false,
  todayExtensionsOrder: ['habits', 'goals', 'todo'],
  bumpTodayExtensionStackOrder: async () => {},
};

export function ExtensionsPolicyProvider({
  policy,
  children,
}: {
  policy: ExtensionsPolicy;
  children: ReactNode;
}): React.ReactElement {
  return <Ctx.Provider value={policy}>{children}</Ctx.Provider>;
}

export function useExtensionsPolicy(): ExtensionsPolicy {
  return useContext(Ctx) ?? FALLBACK_POLICY;
}
