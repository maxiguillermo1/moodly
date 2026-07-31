import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Calendar day key scope for extensions (single prop source for nested slots).
 * @module extensions/DayScopeContext
 */
import React, { createContext, useContext, useMemo } from 'react';
const Ctx = createContext(null);
export function DayScopeProvider({ dateKey, children, }) {
    const v = useMemo(() => ({ dateKey }), [dateKey]);
    return _jsx(Ctx.Provider, { value: v, children: children });
}
export function useDayScope() {
    const v = useContext(Ctx);
    if (!v) {
        throw new Error('[useDayScope] Missing DayScopeProvider — wrap TodayExtensionsPanel subtree.');
    }
    return v;
}
