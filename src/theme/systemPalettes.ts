/**
 * @fileoverview Light / dark system color palettes (interface-aware).
 * @module theme/systemPalettes
 *
 * Values track Apple’s iOS system colors closely (HIG / UIColor semantic).
 */

export type SystemPalette = {
  background: string;
  secondaryBackground: string;
  tertiaryBackground: string;
  fill: string;
  secondaryFill: string;
  tertiaryFill: string;
  label: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  quaternaryLabel: string;
  separator: string;
  opaqueSeparator: string;
  blue: string;
  green: string;
  indigo: string;
  orange: string;
  pink: string;
  purple: string;
  red: string;
  teal: string;
  yellow: string;
  gray: string;
  gray2: string;
  gray3: string;
  gray4: string;
  gray5: string;
  gray6: string;
};

export const systemLight: SystemPalette = {
  /** Primary canvas — pure white (grouped surfaces use {@link secondaryBackground}). */
  background: '#FFFFFF',
  /** Grouped lists, cards — Bright Snow. */
  secondaryBackground: '#F8F9FA',
  /** Nested / tertiary grouped surfaces — Platinum. */
  tertiaryBackground: '#E9ECEF',
  fill: 'rgba(120, 120, 128, 0.2)',
  secondaryFill: 'rgba(120, 120, 128, 0.16)',
  tertiaryFill: 'rgba(118, 118, 128, 0.12)',
  label: '#000000',
  secondaryLabel: 'rgba(60, 60, 67, 0.6)',
  tertiaryLabel: 'rgba(60, 60, 67, 0.3)',
  quaternaryLabel: 'rgba(60, 60, 67, 0.18)',
  separator: 'rgba(60, 60, 67, 0.29)',
  opaqueSeparator: '#C6C6C8',
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
};

export const systemDark: SystemPalette = {
  background: '#000000',
  secondaryBackground: '#1C1C1E',
  tertiaryBackground: '#2C2C2E',
  fill: 'rgba(120, 120, 128, 0.36)',
  secondaryFill: 'rgba(120, 120, 128, 0.32)',
  tertiaryFill: 'rgba(118, 118, 128, 0.24)',
  label: '#FFFFFF',
  secondaryLabel: 'rgba(235, 235, 245, 0.6)',
  tertiaryLabel: 'rgba(235, 235, 245, 0.3)',
  quaternaryLabel: 'rgba(235, 235, 245, 0.18)',
  separator: 'rgba(84, 84, 88, 0.65)',
  opaqueSeparator: '#38383A',
  blue: '#0A84FF',
  green: '#30D158',
  indigo: '#5E5CE6',
  orange: '#FF9F0A',
  pink: '#FF375F',
  purple: '#BF5AF2',
  red: '#FF453A',
  teal: '#64D2FF',
  yellow: '#FFD60A',
  gray: '#8E8E93',
  gray2: '#636366',
  gray3: '#48484A',
  gray4: '#3A3A3C',
  gray5: '#2C2C2E',
  gray6: '#1C1C1E',
};

export type GlassPalette = {
  background: string;
  border: string;
  highlight: string;
  shadow: string;
};

export const glassLight: GlassPalette = {
  background: 'rgba(255, 255, 255, 0.72)',
  border: 'rgba(60, 60, 67, 0.15)',
  highlight: 'rgba(255, 255, 255, 0.82)',
  shadow: 'rgba(0, 0, 0, 0.16)',
};

export const glassDark: GlassPalette = {
  background: 'rgba(36, 36, 38, 0.80)',
  border: 'rgba(255, 255, 255, 0.12)',
  highlight: 'rgba(255, 255, 255, 0.22)',
  shadow: 'rgba(0, 0, 0, 0.58)',
};
