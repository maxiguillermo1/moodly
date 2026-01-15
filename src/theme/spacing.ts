/**
 * @fileoverview iOS-style spacing and sizing
 * @module theme/spacing
 */

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** iOS-style border radius */
export const borderRadius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

/** iOS standard sizing */
export const sizing = {
  // Navigation
  navBarHeight: 70,
  tabBarPadding: 34,
  floatingNavHeight: 64,
  floatingNavWidth: 200,
  
  // List items
  rowHeight: 44,
  rowHeightLarge: 56,
  
  // Icons
  iconSm: 20,
  iconMd: 24,
  iconLg: 28,
  settingsIcon: 22,
  
  // Touch targets
  minTouchTarget: 44,
} as const;
