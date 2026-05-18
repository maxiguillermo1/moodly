/**
 * @fileoverview iOS San Francisco-style typography
 * @module theme/typography
 *
 * Scale: page titles / title styles −2pt vs prior; body and smaller text −1pt (line heights nudged to match).
 */

import { TextStyle } from 'react-native';

/** SF Pro-like font weights */
export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/** iOS Typography Scale */
export const typography: Record<string, TextStyle> = {
  // Large Title (Navigation)
  largeTitle: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.37,
  },

  // Title styles
  title1: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.35,
  },
  title3: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.38,
  },

  // Headline
  headline: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.41,
  },

  // Body
  body: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: fontWeight.regular,
    letterSpacing: -0.41,
  },

  // Callout
  callout: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeight.regular,
    letterSpacing: -0.32,
  },

  // Subhead
  subhead: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: fontWeight.regular,
    letterSpacing: -0.24,
  },

  // Footnote
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: fontWeight.regular,
    letterSpacing: -0.08,
  },

  // Caption
  caption1: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: fontWeight.regular,
  },
  caption2: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: fontWeight.regular,
    letterSpacing: 0.07,
  },

  // ------------------------------------------------------------------------
  // Compatibility aliases (older internal components expect these keys).
  // We map them onto the iOS scale above to avoid runtime crashes while
  // preserving the Apple-like typography system.
  // ------------------------------------------------------------------------

  // Headings
  headingLg: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.38,
  },
  headingMd: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.41,
  },
  headingSm: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.24,
  },

  // Body
  bodyLg: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: fontWeight.regular,
    letterSpacing: -0.41,
  },
  bodyMd: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeight.regular,
    letterSpacing: -0.32,
  },
  bodySm: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: fontWeight.regular,
    letterSpacing: -0.08,
  },

  // Labels
  labelLg: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: fontWeight.medium,
  },
  labelMd: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: fontWeight.medium,
  },
  labelSm: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.07,
  },
};
