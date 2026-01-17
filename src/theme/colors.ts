/**
 * @fileoverview Apple iOS-inspired color system
 * @module theme/colors
 */

import { MoodGrade } from '../types';

/** iOS System Colors */
export const system = {
  // Backgrounds (iOS light mode)
  background: '#F2F2F7',
  secondaryBackground: '#FFFFFF',
  tertiaryBackground: '#F2F2F7',
  
  // Fills
  fill: 'rgba(120, 120, 128, 0.2)',
  secondaryFill: 'rgba(120, 120, 128, 0.16)',
  tertiaryFill: 'rgba(118, 118, 128, 0.12)',
  
  // Labels
  label: '#000000',
  secondaryLabel: 'rgba(60, 60, 67, 0.6)',
  tertiaryLabel: 'rgba(60, 60, 67, 0.3)',
  quaternaryLabel: 'rgba(60, 60, 67, 0.18)',
  
  // Separators
  separator: 'rgba(60, 60, 67, 0.29)',
  opaqueSeparator: '#C6C6C8',
  
  // System tints
  blue: '#007AFF',
  green: '#34C759',
  indigo: '#5856D6',
  orange: '#FF9500',
  pink: '#FF2D55',
  purple: '#AF52DE',
  red: '#FF3B30',
  teal: '#5AC8FA',
  yellow: '#FFCC00',
  gray: '#8E8E93',
  gray2: '#AEAEB2',
  gray3: '#C7C7CC',
  gray4: '#D1D1D6',
  gray5: '#E5E5EA',
  gray6: '#F2F2F7',
} as const;

/** Brand colors (for compatibility) */
export const brand = {
  primary: '#007AFF',
  primaryLight: '#5AC8FA',
  primaryDark: '#0051D4',
} as const;

/** Semantic colors */
export const semantic = {
  background: system.background,
  surface: system.secondaryBackground,
  border: system.separator,
  text: {
    primary: system.label,
    secondary: system.secondaryLabel,
    tertiary: system.tertiaryLabel,
    inverse: '#FFFFFF',
  },
  success: system.green,
  warning: system.orange,
  error: system.red,
} as const;

/** Mood grade colors */
export const mood: Record<MoodGrade, string> = {
  // A+ should be clearly darker than A (user request)
  'A+': '#1B5E20',
  'A':  '#34C759',
  'B':  '#64D2FF',
  'C':  '#FFD60A',
  'D':  '#FF9F0A',
  'F':  '#FF453A',
} as const;

/** Mood background colors (lighter, for calendar cells) */
export const moodBackground: Record<MoodGrade, string> = {
  'A+': 'rgba(27, 94, 32, 0.28)',
  'A':  'rgba(52, 199, 89, 0.3)',
  'B':  'rgba(100, 210, 255, 0.3)',
  'C':  'rgba(255, 214, 10, 0.3)',
  'D':  'rgba(255, 159, 10, 0.3)',
  'F':  'rgba(255, 69, 58, 0.3)',
} as const;

/** "Liquid Glass" material tokens (theme-aware) */
export const glass = {
  light: {
    // Used even without blur to keep a frosted feel
    background: 'rgba(255, 255, 255, 0.62)',
    // Hairline stroke similar to iOS Calendar pills
    border: 'rgba(60, 60, 67, 0.18)',
    // Specular highlight overlay (top-left)
    highlight: 'rgba(255, 255, 255, 0.70)',
    // Soft shadow (depth)
    shadow: 'rgba(0, 0, 0, 0.22)',
  },
  dark: {
    background: 'rgba(28, 28, 30, 0.45)',
    border: 'rgba(255, 255, 255, 0.16)',
    highlight: 'rgba(255, 255, 255, 0.22)',
    shadow: 'rgba(0, 0, 0, 0.60)',
  },
} as const;

/** Export unified colors object */
export const colors = {
  system,
  brand,
  semantic,
  mood,
  moodBackground,
  glass,
} as const;
