import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview iOS-style screen header with large title and settings gear
 * @module components/ui/ScreenHeader
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, typography, sizing, useAppTheme } from '../../theme';
import { CapsuleButton } from './CapsuleButton';
import { Touchable } from '../../ui/Touchable';
/**
 * Horizontal inset for primary-tab large titles (Today, Journal).
 * Matches the Today mood sheet margin; grouped screens (Settings) keep the default {@link spacing} `[4]`.
 */
export const screenHeaderPrimaryTabPaddingX = spacing[6];
function titleStyleForSize(size, labelColor, boldA11y) {
    if (size === 'compact') {
        return {
            ...typography.title3,
            color: labelColor,
            fontWeight: boldA11y ? '700' : typography.title3.fontWeight,
        };
    }
    return {
        ...typography.largeTitle,
        color: labelColor,
        fontWeight: boldA11y ? '800' : typography.largeTitle.fontWeight,
    };
}
export function ScreenHeader({ title, showSettings = true, onPressSettings, leftAccessory, settingsStyle = 'capsule', contentPaddingHorizontal = spacing[4], rightAccessory, titleNumberOfLines = 1, titleVisualSize = 'large', }) {
    const navigation = useNavigation();
    const { system, a11y } = useAppTheme();
    const styles = useMemo(() => StyleSheet.create({
        container: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: spacing[2],
            paddingBottom: titleVisualSize === 'compact' ? spacing[2] : spacing[3],
        },
        titleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            minWidth: 0,
            marginRight: spacing[2],
        },
        title: titleStyleForSize(titleVisualSize, system.label, a11y.boldText),
        settingsCircle: {
            width: sizing.capsuleHeight,
            height: sizing.capsuleHeight,
            borderRadius: sizing.capsuleRadius,
            backgroundColor: system.secondaryBackground,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: system.separator,
            alignItems: 'center',
            justifyContent: 'center',
        },
    }), [a11y.boldText, system.label, system.secondaryBackground, system.separator, titleVisualSize]);
    const titleBlock = (_jsxs(View, { style: styles.titleRow, children: [leftAccessory ? _jsx(View, { style: { marginRight: spacing[2] }, children: leftAccessory }) : null, title.length > 0 ? (_jsx(Text, { style: styles.title, allowFontScaling: true, accessibilityRole: "header", maxFontSizeMultiplier: titleVisualSize === 'compact' ? 1.32 : 1.35, numberOfLines: titleNumberOfLines, children: title })) : null] }));
    const settingsHitSlop = { top: 8, bottom: 8, left: 8, right: 8 };
    const openSettings = () => (onPressSettings ? onPressSettings() : navigation.navigate('Settings'));
    return (_jsxs(View, { style: [styles.container, { paddingHorizontal: contentPaddingHorizontal }], children: [titleBlock, rightAccessory ? rightAccessory : null, !rightAccessory && showSettings && settingsStyle === 'circle' ? (_jsx(Touchable, { onPress: openSettings, hitSlop: settingsHitSlop, accessibilityRole: "button", accessibilityLabel: "Settings", accessibilityHint: "Opens settings", style: styles.settingsCircle, children: _jsx(Ionicons, { name: "settings-outline", size: sizing.settingsIcon, color: system.label, accessibilityElementsHidden: true, importantForAccessibility: "no" }) })) : null, !rightAccessory && showSettings && settingsStyle === 'capsule' ? (_jsx(CapsuleButton, { kind: "icon", iconName: "settings-outline", iconColor: system.label, onPress: openSettings, hitSlop: settingsHitSlop, accessibilityLabel: "Settings", accessibilityHint: "Opens settings" })) : null] }));
}
