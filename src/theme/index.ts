/**
 * @fileoverview Theme surface consumed by screens, navigation, and components.
 * Low-level palettes and helpers live in submodules (e.g. `theme/systemPalettes.ts`).
 * @module theme
 */

export { colors, mood } from './colors';
export { AppThemeProvider, useAppTheme } from './AppThemeContext';
export { ExtensionsPolicyProvider, useExtensionsPolicy, type ExtensionsPolicy } from './ExtensionsPolicyContext';
export { getCalendarTextLimits, getMonthTimelineSpacing } from './calendarDensity';
export { spacing, borderRadius, sizing } from './spacing';
export { typography } from './typography';
