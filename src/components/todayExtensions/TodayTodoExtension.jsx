import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * @fileoverview Today extension row: quick add + tap opens Reminders for this day.
 * @module components/todayExtensions/TodayTodoExtension
 *
 * Intentionally minimal vs {@link TodoScreen} — the full screen carries hints, time picker, and chrome.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { borderRadius, spacing, typography, sizing, useAppTheme } from '../../theme';
import { useExtensionsPolicy } from '../../theme/ExtensionsPolicyContext';
import { useDayExtensionsHost } from '../../extensions/DayExtensionsHostContext';
import { useDayTodos } from '../../hooks';
import { minimalTodoExtensionTeaser } from '../../utils';
import { Touchable } from '../../ui/Touchable';
import { haptics } from '../../system/haptics';
import { DAY_TODO_MAX_ITEMS_PER_DAY, MAX_DAY_TODO_TITLE_LEN } from '../../types';
export function TodayTodoExtension({ date, containerStyle, layout = 'card', }) {
    const navigation = useNavigation();
    const { todayTodoEnabled } = useExtensionsPolicy();
    const { onBeforeDetailNavigate } = useDayExtensionsHost();
    const { system: s } = useAppTheme();
    const { items, loaded, busy, add } = useDayTodos(date);
    const [quickDraft, setQuickDraft] = useState('');
    const stacked = layout === 'stack';
    const teaser = useMemo(() => minimalTodoExtensionTeaser(items, date), [items, date]);
    const title = loaded ? teaser.title : 'Reminders';
    const detail = loaded ? teaser.detail : null;
    const a11yRow = loaded ? teaser.accessibilityLabel : 'Reminders, loading';
    const atItemCap = items.length >= DAY_TODO_MAX_ITEMS_PER_DAY;
    const canCommit = quickDraft.trim().length > 0 && !busy && !atItemCap;
    const openFull = useCallback(() => {
        haptics.select();
        onBeforeDetailNavigate?.();
        navigation.navigate('Todo', { date });
    }, [navigation, date, onBeforeDetailNavigate]);
    const commitQuick = useCallback(async () => {
        const t = quickDraft.trim();
        if (!t || busy || atItemCap)
            return;
        setQuickDraft('');
        await add(t);
        haptics.success();
    }, [add, atItemCap, busy, quickDraft]);
    const styles = useMemo(() => StyleSheet.create({
        card: {
            backgroundColor: s.secondaryBackground,
            borderRadius: borderRadius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: s.separator,
            paddingVertical: stacked ? spacing[4] : spacing[6],
            paddingHorizontal: stacked ? spacing[4] : spacing[6],
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        iconWell: {
            width: stacked ? 32 : 36,
            height: stacked ? 32 : 36,
            borderRadius: stacked ? 8 : 10,
            backgroundColor: s.indigo,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing[3],
        },
        textCol: {
            flex: 1,
            minWidth: 0,
        },
        title: {
            ...(stacked ? typography.subhead : typography.headline),
            fontWeight: '600',
            color: s.label,
        },
        detail: {
            ...typography.caption1,
            color: s.tertiaryLabel,
            marginTop: spacing[1],
            lineHeight: 16,
        },
        chevron: {
            marginLeft: spacing[2],
        },
        quickRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: stacked ? spacing[2] : spacing[4],
            paddingTop: stacked ? spacing[2] : spacing[4],
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: s.separator,
        },
        quickInput: {
            flex: 1,
            ...(stacked ? typography.footnote : typography.subhead),
            color: s.label,
            paddingVertical: stacked ? spacing[1] : spacing[2],
            minWidth: 0,
            marginRight: spacing[2],
        },
        addBtn: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: s.fill,
            alignItems: 'center',
            justifyContent: 'center',
        },
    }), [s, stacked]);
    if (!todayTodoEnabled) {
        return null;
    }
    const summary = (_jsxs(View, { style: styles.row, children: [_jsx(View, { style: styles.iconWell, children: _jsx(Ionicons, { name: "alarm-outline", size: stacked ? 18 : sizing.iconSm, color: "#FFFFFF", accessibilityElementsHidden: true, importantForAccessibility: "no" }) }), _jsxs(View, { style: styles.textCol, children: [_jsx(Text, { style: styles.title, allowFontScaling: true, maxFontSizeMultiplier: 1.28, numberOfLines: 1, children: title }), detail ? (_jsx(Text, { style: styles.detail, allowFontScaling: true, maxFontSizeMultiplier: 1.3, numberOfLines: 2, children: detail })) : null] }), _jsx(Ionicons, { name: "chevron-forward", size: stacked ? 16 : 18, color: s.tertiaryLabel, style: styles.chevron, accessibilityElementsHidden: true, importantForAccessibility: "no" })] }));
    const body = (_jsxs(_Fragment, { children: [_jsx(Touchable, { onPress: openFull, accessibilityRole: "button", accessibilityLabel: `${a11yRow}. Opens full list.`, accessibilityHint: "Opens reminders for this day", children: summary }), _jsxs(View, { style: styles.quickRow, children: [_jsx(TextInput, { value: quickDraft, onChangeText: setQuickDraft, placeholder: atItemCap ? 'Full' : 'Quick add', placeholderTextColor: s.tertiaryLabel, style: styles.quickInput, maxFontSizeMultiplier: 1.32, maxLength: MAX_DAY_TODO_TITLE_LEN, editable: !busy && !atItemCap, returnKeyType: "done", blurOnSubmit: false, onSubmitEditing: () => void commitQuick(), accessibilityLabel: "Quick add reminder for this day", accessibilityHint: `Up to ${MAX_DAY_TODO_TITLE_LEN} characters` }), _jsx(Touchable, { onPress: () => void commitQuick(), disabled: !canCommit, accessibilityRole: "button", accessibilityLabel: "Add reminder", accessibilityState: { disabled: !canCommit }, style: ({ pressed }) => [styles.addBtn, pressed ? { opacity: 0.88 } : null, !canCommit ? { opacity: 0.35 } : null], children: _jsx(Ionicons, { name: "arrow-up", size: 16, color: s.indigo, accessibilityElementsHidden: true, importantForAccessibility: "no" }) })] })] }));
    if (stacked) {
        return (_jsx(View, { style: [{ width: '100%' }, containerStyle], accessibilityRole: "none", children: body }));
    }
    return (_jsx(View, { style: [{ width: '100%' }, containerStyle], accessibilityRole: "none", children: _jsx(View, { style: styles.card, children: body }) }));
}
