/**
 * @fileoverview Calendar day key scope for extensions (single prop source for nested slots).
 * @module extensions/DayScopeContext
 */

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';

type DayScopeValue = { dateKey: string };

const Ctx = createContext<DayScopeValue | null>(null);

export function DayScopeProvider({
  dateKey,
  children,
}: {
  dateKey: string;
  children: ReactNode;
}): React.ReactElement {
  const v = useMemo(() => ({ dateKey }), [dateKey]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useDayScope(): DayScopeValue {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('[useDayScope] Missing DayScopeProvider — wrap TodayExtensionsPanel subtree.');
  }
  return v;
}
