/**
 * @fileoverview Extension system entrypoints (registry + day scope + stack renderer).
 * @module extensions
 */

export { DayScopeProvider, useDayScope } from './DayScopeContext';
export { DayExtensionsHostProvider, useDayExtensionsHost, type DayExtensionsHost } from './DayExtensionsHostContext';
export { DayExtensionsStack, type DayExtensionsStackProps } from './DayExtensionsStack';
export {
  DAY_EXTENSION_PLUGINS,
  orderedActiveExtensionPlugins,
  type DayExtensionPlugin,
} from './dayExtensionRegistry';
export type { TodayExtensionsInsetVariant } from './types';
