import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview Shared iOS Calendar-style capsule button (source of truth: CalendarScreen).
 *
 * Visual regression checklist (manual):
 * - Height = `sizing.capsuleHeight` (36)
 * - Radius = `sizing.capsuleRadius` (18)
 * - Hairline border + glass fill (via `LiquidGlass`)
 * - Icon size = `sizing.iconSm` (20)
 * - Back capsule paddingHorizontal = 12, gap = 4
 * - Icon-only capsule paddingHorizontal = 10, minWidth = capsuleHeight
 *
 * Non-negotiable: screenshots should match before/after (resting state identical).
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LiquidGlass } from './LiquidGlass';
import { sizing, typography, useAppTheme } from '../../theme';
import { DEFAULT_HIT_SLOP } from '../../system/accessibility';
export function CapsuleButton(props) {
    const { system } = useAppTheme();
    const { kind, onPress, disabled, accessibilityLabel, accessibilityHint, accessibilityState, hitSlop, testID, iconName, iconColor, label, labelColor, style, labelStyle, } = props;
    const resolvedHitSlop = hitSlop ?? DEFAULT_HIT_SLOP;
    const resolvedIconColor = iconColor ?? system.label;
    const resolvedLabelColor = labelColor ?? system.blue;
    const containerStyle = useMemo(() => {
        return [
            styles.base,
            kind === 'icon' ? styles.icon : styles.back,
            disabled ? styles.disabled : null,
            style,
        ];
    }, [disabled, kind, style]);
    return (_jsxs(Pressable, { testID: testID, onPress: onPress, disabled: disabled, hitSlop: resolvedHitSlop, accessibilityRole: "button", accessibilityState: { ...accessibilityState, disabled: !!disabled }, accessibilityLabel: accessibilityLabel, accessibilityHint: accessibilityHint, android_disableSound: true, android_ripple: undefined, style: ({ pressed }) => [containerStyle, pressed ? styles.pressedOpacity : null], children: [_jsx(LiquidGlass, { style: StyleSheet.absoluteFill, radius: sizing.capsuleRadius, shadow: false, children: null }), _jsx(Ionicons, { name: iconName, size: sizing.iconSm, color: resolvedIconColor, accessibilityElementsHidden: true, importantForAccessibility: "no" }), kind === 'back' ? (_jsx(Text, { style: [styles.backLabel, { color: resolvedLabelColor }, labelStyle], allowFontScaling: true, numberOfLines: 1, children: label ?? '' })) : null] }));
}
const styles = StyleSheet.create({
    base: {
        height: sizing.capsuleHeight,
        borderRadius: sizing.capsuleRadius,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    icon: {
        minWidth: sizing.capsuleHeight,
        paddingHorizontal: 10,
    },
    back: {
        paddingHorizontal: 12,
        gap: 4,
    },
    backLabel: {
        ...typography.subhead,
        fontWeight: '600',
    },
    pressedOpacity: { opacity: 0.7 },
    disabled: { opacity: 0.45 },
});
