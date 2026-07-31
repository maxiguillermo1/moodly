import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Renders enabled day extensions for one calendar date (registry-driven).
 * @module extensions/DayExtensionsStack
 */
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useExtensionsPolicy } from '../theme/ExtensionsPolicyContext';
import { DayExtensionsHostProvider } from './DayExtensionsHostContext';
import { DayScopeProvider } from './DayScopeContext';
import { orderedActiveExtensionPlugins } from './dayExtensionRegistry';
function DayExtensionsStackInner({ dateKey, insetVariant = 'screen', style, onBeforeDetailNavigate, }) {
    const policy = useExtensionsPolicy();
    const plugins = useMemo(() => orderedActiveExtensionPlugins(policy), [policy]);
    const host = useMemo(() => ({ onBeforeDetailNavigate }), [onBeforeDetailNavigate]);
    const panelStyle = useMemo(() => StyleSheet.create({
        panel: {
            width: '100%',
            backgroundColor: 'transparent',
            borderWidth: 0,
            overflow: 'visible',
        },
    }).panel, []);
    if (plugins.length === 0) {
        return null;
    }
    return (_jsx(DayExtensionsHostProvider, { value: host, children: _jsx(DayScopeProvider, { dateKey: dateKey, children: _jsx(View, { style: style, accessibilityRole: "none", children: _jsx(View, { style: panelStyle, children: plugins.map((plugin) => {
                        const Slot = plugin.Slot;
                        return (_jsx(React.Fragment, { children: _jsx(Slot, { insetVariant: insetVariant }) }, plugin.id));
                    }) }) }) }) }));
}
/** Memoized: avoids re-running registry resolution when an ancestor re-renders with the same `dateKey`. */
export const DayExtensionsStack = React.memo(DayExtensionsStackInner);
