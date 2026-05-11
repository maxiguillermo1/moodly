/**
 * @fileoverview Unified iOS theme exports
 * @module theme
 */

export {
  colors,
  system,
  brand,
  semantic,
  mood,
  moodGradientMid,
  moodBloomAccent,
  moodBackground,
  glass,
} from './colors';
export { systemLight, systemDark, glassLight, glassDark, type SystemPalette, type GlassPalette } from './systemPalettes';
export { createSemantic, type SemanticPalette } from './createSemantic';
export { AppThemeProvider, useAppTheme, type AppTheme, type AppA11y } from './AppThemeContext';
export { getCalendarTextLimits, getMonthTimelineSpacing, type CalendarTextLimits } from './calendarDensity';
export { spacing, borderRadius, sizing } from './spacing';
export { typography, fontWeight } from './typography';
export { shadows } from './shadows';
