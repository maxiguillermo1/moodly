import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * @fileoverview iOS Settings-style grouped list components
 * @module components/ui/GroupedList
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, borderRadius, typography, useAppTheme } from '../../theme';
import { Touchable } from '../../ui/Touchable';
const SYMBOL_WELL_SIZE = 29;
const SYMBOL_WELL_RADIUS = 7;
const SYMBOL_ICON_SIZE = 18;
function useGroupedStyles() {
    const { system: s } = useAppTheme();
    return useMemo(() => StyleSheet.create({
        section: {
            marginBottom: spacing[6],
        },
        sectionHeader: {
            ...typography.footnote,
            fontWeight: '600',
            color: s.secondaryLabel,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            paddingHorizontal: spacing[4],
            paddingBottom: spacing[2],
        },
        sectionContent: {
            backgroundColor: s.secondaryBackground,
            borderRadius: borderRadius.lg,
            marginHorizontal: spacing[4],
            overflow: 'hidden',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: s.separator,
        },
        sectionFooter: {
            ...typography.footnote,
            color: s.secondaryLabel,
            paddingHorizontal: spacing[4],
            paddingTop: spacing[2],
            lineHeight: 17,
        },
        symbolWell: {
            width: SYMBOL_WELL_SIZE,
            height: SYMBOL_WELL_SIZE,
            borderRadius: SYMBOL_WELL_RADIUS,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing[3],
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: spacing[3],
            paddingHorizontal: spacing[4],
            backgroundColor: s.secondaryBackground,
            minHeight: 44,
        },
        rowPressed: {
            backgroundColor: s.fill,
        },
        rowFirst: {
            borderTopLeftRadius: borderRadius.lg,
            borderTopRightRadius: borderRadius.lg,
        },
        rowLast: {
            borderBottomLeftRadius: borderRadius.lg,
            borderBottomRightRadius: borderRadius.lg,
        },
        separator: {
            position: 'absolute',
            right: 0,
            bottom: 0,
            height: StyleSheet.hairlineWidth,
            backgroundColor: s.separator,
        },
        rowIcon: {
            fontSize: 20,
            marginRight: spacing[3],
        },
        rowLabel: {
            ...typography.body,
            color: s.label,
            flex: 1,
        },
        rowLabelDestructive: {
            color: s.red,
        },
        rowRight: {
            flexDirection: 'row',
            alignItems: 'center',
            flexShrink: 0,
        },
        rowValue: {
            ...typography.body,
            color: s.secondaryLabel,
            marginRight: spacing[2],
            fontVariant: ['tabular-nums'],
        },
        chevronIcon: {
            marginRight: -1,
        },
    }), [s]);
}
export function GroupedSection({ header, footer, children }) {
    const styles = useGroupedStyles();
    return (_jsxs(View, { style: styles.section, accessibilityRole: "none", children: [header && (_jsx(Text, { style: styles.sectionHeader, allowFontScaling: true, maxFontSizeMultiplier: 1.3, children: header })), _jsx(View, { style: styles.sectionContent, children: children }), footer && (_jsx(Text, { style: styles.sectionFooter, allowFontScaling: true, maxFontSizeMultiplier: 1.35, children: footer }))] }));
}
export function GroupedRow({ label, value, icon, symbol, onPress, showChevron = true, isFirst = false, isLast = false, destructive = false, right, accessibilityLabel, accessibilityHint, accessibilityState, accessibilityValue, }) {
    const styles = useGroupedStyles();
    const { system } = useAppTheme();
    const hasSymbol = !!symbol;
    const hasEmoji = !!icon && !hasSymbol;
    const separatorInsetLeft = spacing[4] +
        (hasSymbol ? SYMBOL_WELL_SIZE + spacing[3] : hasEmoji ? 22 + spacing[3] : 0);
    const leading = hasSymbol ? (_jsx(View, { accessible: false, importantForAccessibility: "no", style: [
            styles.symbolWell,
            {
                backgroundColor: symbol.wellColor,
            },
        ], children: _jsx(Ionicons, { name: symbol.name, size: SYMBOL_ICON_SIZE, color: symbol.iconColor ?? '#FFFFFF', accessibilityElementsHidden: true, importantForAccessibility: "no" }) })) : hasEmoji ? (_jsx(Text, { style: styles.rowIcon, allowFontScaling: false, accessible: false, accessibilityElementsHidden: true, importantForAccessibility: "no", children: icon })) : null;
    const defaultA11yLabel = value ? `${label}, ${value}` : label;
    const content = (_jsxs(View, { style: [styles.row, isFirst && styles.rowFirst, isLast && styles.rowLast], children: [leading, _jsx(Text, { style: [styles.rowLabel, destructive && styles.rowLabelDestructive], allowFontScaling: true, maxFontSizeMultiplier: 1.34, numberOfLines: 1, children: label }), _jsx(View, { style: styles.rowRight, children: right ?? (_jsxs(_Fragment, { children: [value ? (_jsx(Text, { style: styles.rowValue, allowFontScaling: true, numberOfLines: 1, maxFontSizeMultiplier: 1.35, children: value })) : null, onPress && showChevron ? (_jsx(Ionicons, { name: "chevron-forward", size: 14, color: system.tertiaryLabel, style: styles.chevronIcon, accessibilityElementsHidden: true, importantForAccessibility: "no" })) : null] })) }), !isLast ? (_jsx(View, { pointerEvents: "none", style: [styles.separator, { left: separatorInsetLeft }] })) : null] }));
    if (onPress) {
        return (_jsx(Touchable, { onPress: onPress, accessibilityRole: "button", accessibilityLabel: accessibilityLabel ?? defaultA11yLabel, accessibilityHint: accessibilityHint, accessibilityState: accessibilityState, accessibilityValue: accessibilityValue, style: ({ pressed }) => (pressed ? styles.rowPressed : undefined), children: content }));
    }
    if (!right) {
        return (_jsx(View, { accessible: true, accessibilityLabel: accessibilityLabel ?? defaultA11yLabel, accessibilityHint: accessibilityHint, accessibilityState: accessibilityState, accessibilityValue: accessibilityValue, children: content }));
    }
    return content;
}
