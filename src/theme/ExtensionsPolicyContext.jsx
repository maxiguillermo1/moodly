import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Narrow settings slice for Today / day-editor extensions (stable memo boundary).
 * Keeps extension UI from coupling to the full {@link AppTheme} object for toggle/order state.
 * @module theme/ExtensionsPolicyContext
 */
import React, { createContext, useContext } from 'react';
const Ctx = createContext(null);
const FALLBACK_POLICY = {
    habitsEnabled: false,
    todayGoalsEnabled: false,
    todayTodoEnabled: false,
    todayExtensionsOrder: ['habits', 'goals', 'todo'],
    bumpTodayExtensionStackOrder: async () => { },
};
export function ExtensionsPolicyProvider({ policy, children, }) {
    return _jsx(Ctx.Provider, { value: policy, children: children });
}
export function useExtensionsPolicy() {
    return useContext(Ctx) ?? FALLBACK_POLICY;
}
