import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview Gentle prompt to back up the mood timeline via cloud account.
 * @module features/account/components/CloudBackupPromptModal
 */
import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LiquidGlass } from '@/components';
import { borderRadius, spacing, typography, useAppTheme } from '@/theme';
import { haptics } from '@/system/haptics';
import { Touchable } from '@/ui/Touchable';
export function CloudBackupPromptModal({ visible, onBackUp, onNotNow, }) {
    const { system: s, a11y } = useAppTheme();
    const styles = useMemo(() => StyleSheet.create({
        backdrop: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
            justifyContent: 'center',
            paddingHorizontal: spacing[4],
        },
        sheetGlass: {
            borderRadius: borderRadius.xl,
            overflow: 'hidden',
        },
        sheet: {
            padding: spacing[4],
            backgroundColor: s.secondaryBackground,
        },
        iconWell: {
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: s.blue,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
            marginBottom: spacing[3],
        },
        title: {
            ...typography.title3,
            color: s.label,
            textAlign: 'center',
            marginBottom: spacing[2],
        },
        body: {
            ...typography.subhead,
            color: s.secondaryLabel,
            textAlign: 'center',
            lineHeight: 21,
            marginBottom: spacing[4],
        },
        primaryButton: {
            backgroundColor: s.blue,
            borderRadius: borderRadius.lg,
            paddingVertical: spacing[3],
            alignItems: 'center',
            marginBottom: spacing[2],
        },
        primaryLabel: {
            ...typography.body,
            color: '#FFFFFF',
            fontWeight: '600',
        },
        secondaryButton: {
            paddingVertical: spacing[2],
            alignItems: 'center',
        },
        secondaryLabel: {
            ...typography.body,
            color: s.blue,
        },
    }), [s]);
    return (_jsx(Modal, { visible: visible, transparent: true, animationType: a11y.reduceMotion ? 'none' : 'fade', onRequestClose: onNotNow, children: _jsx(View, { style: styles.backdrop, children: _jsx(LiquidGlass, { style: styles.sheetGlass, radius: borderRadius.xl, intensity: 72, prominent: true, children: _jsxs(View, { style: styles.sheet, accessibilityViewIsModal: true, accessibilityRole: "alert", children: [_jsx(View, { style: styles.iconWell, accessible: false, importantForAccessibility: "no", children: _jsx(Ionicons, { name: "cloud-upload-outline", size: 26, color: "#FFFFFF" }) }), _jsx(Text, { style: styles.title, allowFontScaling: true, maxFontSizeMultiplier: 1.3, children: "Back up your timeline?" }), _jsx(Text, { style: styles.body, allowFontScaling: true, maxFontSizeMultiplier: 1.35, children: "You have mood entries on this device. Sign in to keep your colored timeline safe across reinstalls and new phones \u2014 optional, and always private." }), _jsx(Touchable, { style: styles.primaryButton, onPress: () => {
                                haptics.select();
                                onBackUp();
                            }, accessibilityRole: "button", accessibilityLabel: "Back up timeline", accessibilityHint: "Opens account sign in", children: _jsx(Text, { style: styles.primaryLabel, allowFontScaling: true, children: "Back up timeline" }) }), _jsx(Touchable, { style: styles.secondaryButton, onPress: () => {
                                haptics.select();
                                onNotNow();
                            }, accessibilityRole: "button", accessibilityLabel: "Not now", children: _jsx(Text, { style: styles.secondaryLabel, allowFontScaling: true, children: "Not now" }) })] }) }) }) }));
}
