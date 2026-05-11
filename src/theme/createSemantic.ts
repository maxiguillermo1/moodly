/**
 * @fileoverview Derive semantic tokens from the active system palette.
 * @module theme/createSemantic
 */

import type { SystemPalette } from './systemPalettes';

export type SemanticPalette = {
  background: string;
  surface: string;
  border: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  success: string;
  warning: string;
  error: string;
};

export function createSemantic(system: SystemPalette): SemanticPalette {
  return {
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
  };
}
