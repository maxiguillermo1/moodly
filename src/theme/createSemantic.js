/**
 * @fileoverview Derive semantic tokens from the active system palette.
 * @module theme/createSemantic
 */
export function createSemantic(system) {
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
