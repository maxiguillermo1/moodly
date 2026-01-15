/**
 * @fileoverview iOS San Francisco-style typography
 * @module theme/typography
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
    fontSize: 34,
    lineHeight: 41,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.37,
  },
  
  // Title styles
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.35,
  },
  title3: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.38,
  },
  
  // Headline
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.41,
  },
  
  // Body
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeight.regular,
    letterSpacing: -0.41,
  },
  
  // Callout
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: fontWeight.regular,
    letterSpacing: -0.32,
  },
  
  // Subhead
  subhead: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeight.regular,
    letterSpacing: -0.24,
  },
  
  // Footnote
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeight.regular,
    letterSpacing: -0.08,
  },
  
  // Caption
  caption1: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeight.regular,
  },
  caption2: {
    fontSize: 11,
    lineHeight: 13,
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
    fontSize: 20,
    lineHeight: 25,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.38,
  },
  headingMd: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.41,
  },
  headingSm: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.24,
  },

  // Body
  bodyLg: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: fontWeight.regular,
    letterSpacing: -0.41,
  },
  bodyMd: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: fontWeight.regular,
    letterSpacing: -0.32,
  },
  bodySm: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeight.regular,
    letterSpacing: -0.08,
  },

  // Labels
  labelLg: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
  },
  labelMd: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeight.medium,
  },
  labelSm: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.07,
  },
};
