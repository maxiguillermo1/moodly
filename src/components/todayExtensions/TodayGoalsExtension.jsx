import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview Today extension row: open Goals screen (same pattern as Habits from Settings).
 * @module components/todayExtensions/TodayGoalsExtension
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { borderRadius, spacing, typography, sizing, useAppTheme } from '../../theme';
import { useExtensionsPolicy } from '../../theme/ExtensionsPolicyContext';
import { useDayExtensionsHost } from '../../extensions/DayExtensionsHostContext';
import { Touchable } from '../../ui/Touchable';
import { haptics } from '../../system/haptics';
import { getTodayGoalSummaries, peekTodayGoalSummariesFromSessionCache } from '../../storage';
export function TodayGoalsExtension({ date, containerStyle, layout = 'card', }) {
    const navigation = useNavigation();
    const { todayGoalsEnabled } = useExtensionsPolicy();
    const { onBeforeDetailNavigate } = useDayExtensionsHost();
    const { system: s } = useAppTheme();
    const stacked = layout === 'stack';
    const [goals, setGoals] = useState(() => peekTodayGoalSummariesFromSessionCache(layout === 'stack' ? 2 : 3) ?? []);
    useEffect(() => {
        let cancelled = false;
        if (!todayGoalsEnabled)
            return;
        const limit = stacked ? 2 : 3;
        const peeked = peekTodayGoalSummariesFromSessionCache(limit);
        if (peeked) {
            setGoals((prev) => {
                if (prev.length === peeked.length && prev.every((g, i) => g.id === peeked[i]?.id))
                    return prev;
                return peeked;
            });
        }
        const runFetch = () => {
            void getTodayGoalSummaries(limit)
                .then((next) => {
                if (!cancelled)
                    setGoals(next);
            })
                .catch(() => {
                if (!cancelled)
                    setGoals([]);
            });
        };
        if (peeked !== undefined) {
            queueMicrotask(runFetch);
            return () => {
                cancelled = true;
            };
        }
        const task = InteractionManager.runAfterInteractions(runFetch);
        return () => {
            cancelled = true;
            task.cancel();
        };
    }, [stacked, todayGoalsEnabled]);
    const openGoals = useCallback(() => {
        haptics.select();
        onBeforeDetailNavigate?.();
        navigation.navigate('Goals', { date });
    }, [navigation, date, onBeforeDetailNavigate]);
    const styles = useMemo(() => StyleSheet.create({
        card: {
            backgroundColor: s.secondaryBackground,
            borderRadius: borderRadius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: s.separator,
            paddingVertical: spacing[4],
            paddingHorizontal: spacing[4],
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        iconWell: {
            width: stacked ? 32 : 36,
            height: stacked ? 32 : 36,
            borderRadius: stacked ? 8 : 10,
            backgroundColor: s.orange,
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
            fontWeight: stacked ? '600' : typography.headline.fontWeight,
            color: s.label,
            marginBottom: spacing[1],
        },
        body: {
            ...(stacked ? typography.footnote : typography.subhead),
            color: s.secondaryLabel,
            lineHeight: stacked ? 17 : 20,
        },
        previewRow: {
            marginTop: spacing[2],
        },
        previewText: {
            ...typography.caption1,
            color: s.tertiaryLabel,
            lineHeight: 16,
        },
        chevron: {
            marginLeft: spacing[2],
        },
    }), [s, stacked]);
    if (!todayGoalsEnabled) {
        return null;
    }
    const preview = goals;
    const previewA11y = preview.length > 0
        ? `Open Goals. ${preview.length} active preview${preview.length === 1 ? '' : 's'}. ${preview
            .slice(0, 2)
            .map((goal) => `${goal.title}, ${Math.round(goal.percent)} percent`)
            .join('. ')}.`
        : 'Open Goals. Start with one small goal.';
    const inner = (_jsxs(View, { style: styles.row, children: [_jsx(View, { style: styles.iconWell, children: _jsx(Ionicons, { name: "flag-outline", size: stacked ? 18 : sizing.iconSm, color: "#FFFFFF", accessibilityElementsHidden: true, importantForAccessibility: "no" }) }), _jsxs(View, { style: styles.textCol, children: [_jsx(Text, { style: styles.title, allowFontScaling: true, maxFontSizeMultiplier: 1.28, children: "Goals" }), _jsx(Text, { style: styles.body, allowFontScaling: true, maxFontSizeMultiplier: 1.34, children: preview.length > 0 ? 'Small progress, gently tracked' : 'Start with one small goal' }), preview.length > 0 ? (_jsx(View, { style: styles.previewRow, children: preview.map((goal) => (_jsxs(Text, { style: styles.previewText, allowFontScaling: true, maxFontSizeMultiplier: 1.24, numberOfLines: 1, children: [goal.completedToday ? '✓' : '○', " ", goal.title, " ", Math.round(goal.percent), "%"] }, goal.id))) })) : null] }), _jsx(Ionicons, { name: "chevron-forward", size: 18, color: s.tertiaryLabel, style: styles.chevron, accessibilityElementsHidden: true, importantForAccessibility: "no" })] }));
    const content = (_jsx(Touchable, { onPress: openGoals, accessibilityRole: "button", accessibilityLabel: previewA11y, accessibilityHint: "Opens goals for this day", children: inner }));
    if (stacked) {
        return (_jsx(View, { style: [{ width: '100%' }, containerStyle], accessibilityRole: "none", children: content }));
    }
    return (_jsx(View, { style: [{ width: '100%' }, containerStyle], accessibilityRole: "none", children: _jsx(View, { style: styles.card, children: content }) }));
}
