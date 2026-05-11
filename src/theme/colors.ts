/**
 * @fileoverview Apple iOS–inspired color exports (fixed ramps + legacy `colors` bundle).
 * @module theme/colors
 *
 * Interface-aware **system** / **glass** / **semantic** values should come from `useAppTheme()`
 * at runtime. This module keeps static defaults (light) for gradients/moods and older imports.
 */

import { MoodGrade } from '../types';
import { systemLight, systemDark, glassLight, glassDark } from './systemPalettes';
import { createSemantic } from './createSemantic';

/** @deprecated Prefer `useAppTheme().system` for interface-aware UI. */
export const system = systemLight;

export { systemLight, systemDark, glassLight, glassDark };

/** Brand colors */
export const brand = {
  primary: '#007AFF',
  primaryLight: '#5AC8FA',
  primaryDark: '#0051D4',
} as const;

/** @deprecated Prefer `useAppTheme().semantic`. */
export const semantic = createSemantic(systemLight);

/** Mood grade “solid” / gradient start (0%) — Bloom spec tokens; A+ is darker green than A for legibility */
export const mood: Record<MoodGrade, string> = {
  'A+': '#1B7838',
  A: '#30D158',
  B: '#4A90E2',
  C: '#FFD60A',
  D: '#FF9F0A',
  F: '#FF453A',
} as const;

/** Gradient mid stop (70%) before shared pink (Bloom Pink ascent spec). */
export const moodGradientMid: Record<MoodGrade, string> = {
  'A+': '#82D194',
  A: '#BDF6A8',
  B: '#8AB4F8',
  C: '#FFE68A',
  D: '#FFC27A',
  F: '#FF8B87',
} as const;

/** Shared gradient end (100%) — bottom-right pink ascent */
export const moodBloomAccent = '#FFB7E5' as const;

/** Mood background colors (calendar cells, pickers) — low-alpha tints of {@link mood} */
export const moodBackground: Record<MoodGrade, string> = {
  'A+': 'rgba(27, 120, 56, 0.3)',
  A: 'rgba(48, 209, 88, 0.3)',
  B: 'rgba(74, 144, 226, 0.3)',
  C: 'rgba(255, 214, 10, 0.3)',
  D: 'rgba(255, 159, 10, 0.3)',
  F: 'rgba(255, 69, 58, 0.3)',
} as const;

/** Legacy nested glass export (light/dark pair). Prefer `useAppTheme().glass`. */
export const glass = {
  light: glassLight,
  dark: glassDark,
} as const;

export const colors = {
  system,
  brand,
  semantic,
  mood,
  moodGradientMid,
  moodBloomAccent,
  moodBackground,
  glass,
} as const;
