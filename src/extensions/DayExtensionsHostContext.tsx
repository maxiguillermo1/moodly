/**
 * @fileoverview Optional host hooks for day extension stacks (e.g. close modal before pushing Goals/Todo).
 * @module extensions/DayExtensionsHostContext
 */

import React, { createContext, useContext, type ReactNode } from 'react';

export type DayExtensionsHost = {
  /** Called immediately before navigating to a full-screen extension (Goals, To-do). */
  onBeforeDetailNavigate?: () => void;
};

const Ctx = createContext<DayExtensionsHost | null>(null);

export function DayExtensionsHostProvider({
  value,
  children,
}: {
  value: DayExtensionsHost;
  children: ReactNode;
}): React.ReactElement {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDayExtensionsHost(): DayExtensionsHost {
  return useContext(Ctx) ?? {};
}
