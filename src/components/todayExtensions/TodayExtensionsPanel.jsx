import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Extension stack for a calendar day: Habits chips + optional Goals / To-do rows (Today, Journal, Calendar modals).
 * @module components/todayExtensions/TodayExtensionsPanel
 */
import React from 'react';
import { DayExtensionsStack } from '../../extensions/DayExtensionsStack';
function TodayExtensionsPanelInner({ date, style, insetVariant = 'screen', onBeforeDetailNavigate, }) {
    return (_jsx(DayExtensionsStack, { dateKey: date, style: style, insetVariant: insetVariant, onBeforeDetailNavigate: onBeforeDetailNavigate }));
}
/** Memoized: parent mood sheet state updates should not rebuild extension subtrees for the same day. */
export const TodayExtensionsPanel = React.memo(TodayExtensionsPanelInner);
