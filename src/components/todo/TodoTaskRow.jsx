import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview One line in the per-day Reminders list — time cue, swipe to delete, long-press handle to reorder.
 * @module components/todo/TodoTaskRow
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, typography, useAppTheme } from '../../theme';
import { Touchable } from '../../ui/Touchable';
import { haptics } from '../../system/haptics';
import { formatReminderMinutes, isReminderOverdueOnDay } from '../../utils';
const ROW_PAD_X = spacing[4];
export const TodoTaskRow = React.memo(function TodoTaskRow({ item, dayKey, showSeparator, onToggle, onDelete, onEditReminder, drag, isDragging, }) {
    const { system: s } = useAppTheme();
    const swipeRef = useRef(null);
    const reminderLabel = item.reminderMinutes != null ? formatReminderMinutes(item.reminderMinutes) : null;
    const showReminderCtl = Boolean(onEditReminder && !item.done);
    const overdue = item.reminderMinutes != null && !item.done && isReminderOverdueOnDay(dayKey, item.reminderMinutes);
    const styles = useMemo(() => StyleSheet.create({
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: reminderLabel || showReminderCtl ? 58 : 52,
            paddingVertical: spacing[3],
            paddingHorizontal: ROW_PAD_X,
            backgroundColor: s.secondaryBackground,
            opacity: isDragging ? 0.9 : 1,
        },
        sep: {
            position: 'absolute',
            left: ROW_PAD_X + 22 + spacing[3] + (drag ? 30 : 0),
            right: ROW_PAD_X + (showReminderCtl ? 40 : 0),
            bottom: 0,
            height: StyleSheet.hairlineWidth,
            backgroundColor: s.separator,
        },
        dragHandle: {
            paddingRight: spacing[2],
            marginRight: spacing[1],
            justifyContent: 'center',
            minHeight: 44,
            minWidth: 32,
        },
        checkHit: {
            paddingRight: spacing[2],
            marginRight: spacing[1],
        },
        mid: {
            flex: 1,
            minWidth: 0,
            justifyContent: 'center',
        },
        title: {
            ...typography.body,
            color: s.label,
            lineHeight: 22,
        },
        titleDone: {
            color: s.tertiaryLabel,
            textDecorationLine: 'line-through',
        },
        timeLine: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: spacing[1],
        },
        timeIcon: {
            marginRight: spacing[1],
        },
        timeText: {
            ...typography.caption1,
            color: s.tertiaryLabel,
            fontVariant: ['tabular-nums'],
        },
        timeOverdue: {
            color: s.orange,
            fontWeight: '600',
        },
        reminderHit: {
            marginLeft: spacing[2],
            paddingLeft: spacing[2],
            minWidth: 40,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
        },
        rightDelete: {
            width: 72,
            backgroundColor: s.red,
            justifyContent: 'center',
            alignItems: 'center',
        },
    }), [drag, isDragging, reminderLabel, showReminderCtl, s]);
    const flushDelete = useCallback(() => {
        haptics.select();
        swipeRef.current?.close();
        onDelete(item.id);
    }, [item.id, onDelete]);
    const renderRightActions = useCallback(() => (_jsx(Touchable, { onPress: flushDelete, accessibilityRole: "button", accessibilityLabel: `Delete ${item.title}`, style: styles.rightDelete, children: _jsx(Ionicons, { name: "trash-outline", size: 22, color: "#FFFFFF", accessibilityElementsHidden: true, importantForAccessibility: "no" }) })), [flushDelete, item.title, styles.rightDelete]);
    const onAccessibilityAction = useCallback((e) => {
        if (e.nativeEvent.actionName === 'delete')
            flushDelete();
    }, [flushDelete]);
    const rowInner = (_jsxs(View, { style: styles.row, children: [showSeparator ? _jsx(View, { style: styles.sep, pointerEvents: "none" }) : null, drag ? (_jsx(Pressable, { onLongPress: () => {
                    haptics.sheet();
                    drag();
                }, delayLongPress: 200, style: styles.dragHandle, accessibilityRole: "button", accessibilityLabel: "Reorder task", accessibilityHint: "Touch and hold, then drag to reorder this task", children: _jsx(Ionicons, { name: "reorder-two-outline", size: 22, color: s.tertiaryLabel, accessibilityElementsHidden: true, importantForAccessibility: "no" }) })) : null, _jsx(Touchable, { onPress: () => {
                    haptics.toggle();
                    onToggle(item.id, !item.done);
                }, accessibilityRole: "checkbox", accessibilityState: { checked: item.done }, accessibilityLabel: item.done ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`, accessibilityHint: "Toggles completion for this reminder", accessibilityActions: [{ name: 'delete', label: 'Delete' }], onAccessibilityAction: onAccessibilityAction, hitSlop: { top: 8, bottom: 8, left: 4, right: 4 }, style: styles.checkHit, children: _jsx(Ionicons, { name: item.done ? 'checkmark-circle' : 'ellipse-outline', size: 24, color: item.done ? s.green : s.secondaryLabel, accessibilityElementsHidden: true, importantForAccessibility: "no" }) }), _jsxs(View, { style: styles.mid, children: [_jsx(Text, { style: [styles.title, item.done ? styles.titleDone : null], allowFontScaling: true, maxFontSizeMultiplier: 1.34, numberOfLines: 3, children: item.title }), reminderLabel ? (_jsxs(View, { style: styles.timeLine, children: [_jsx(Ionicons, { name: "alarm-outline", size: 14, color: overdue ? s.orange : s.tertiaryLabel, style: styles.timeIcon, accessibilityElementsHidden: true, importantForAccessibility: "no" }), _jsxs(Text, { style: [styles.timeText, overdue ? styles.timeOverdue : null], maxFontSizeMultiplier: 1.28, children: [overdue ? 'Due · ' : '', reminderLabel] })] })) : null] }), showReminderCtl ? (_jsx(Touchable, { onPress: () => {
                    haptics.select();
                    onEditReminder?.(item.id);
                }, style: styles.reminderHit, accessibilityRole: "button", accessibilityLabel: item.reminderMinutes != null ? `Change reminder time for ${item.title}` : `Add reminder time for ${item.title}`, children: _jsx(Ionicons, { name: item.reminderMinutes != null ? 'time' : 'time-outline', size: 22, color: item.reminderMinutes != null ? s.blue : s.tertiaryLabel, accessibilityElementsHidden: true, importantForAccessibility: "no" }) })) : null] }));
    return (_jsx(Swipeable, { ref: swipeRef, friction: 2, enableTrackpadTwoFingerGesture: true, rightThreshold: 40, renderRightActions: renderRightActions, enabled: !isDragging, overshootRight: false, children: rowInner }));
});
