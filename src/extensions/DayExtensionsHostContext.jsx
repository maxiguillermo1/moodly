import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Optional host hooks for day extension stacks (e.g. close modal before pushing Goals/Todo).
 * @module extensions/DayExtensionsHostContext
 */
import React, { createContext, useContext } from 'react';
const Ctx = createContext(null);
export function DayExtensionsHostProvider({ value, children, }) {
    return _jsx(Ctx.Provider, { value: value, children: children });
}
export function useDayExtensionsHost() {
    return useContext(Ctx) ?? {};
}
