import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview Per-day to-do list (opened from Settings or any day extension).
 * @module features/reminders/screens/TodoScreen
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Alert, RefreshControl, } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { ScreenHeader, TodoTaskRow, TodoReminderPicker, screenHeaderPrimaryTabPaddingX } from '@/components';
import { countOpenWithReminder, dayTodoProgressLabel, formatDateForDisplay, getRelativeDayLabel, partitionDayTodos, coerceLocalDayKeyOrToday, } from '@/utils';
import { borderRadius, spacing, typography, useAppTheme } from '@/theme';
import { Touchable } from '@/ui/Touchable';
import { perfProbe, usePerfScreen } from '@/perf';
import { useDayTodos } from '@/hooks';
import { haptics } from '@/system/haptics';
import { DAY_TODO_MAX_ITEMS_PER_DAY, MAX_DAY_TODO_TITLE_LEN } from '@/types';
const CONTENT_GUTTER = screenHeaderPrimaryTabPaddingX;
export default function TodoScreen() {
    usePerfScreen('Todo');
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { system: s, a11y } = useAppTheme();
    const day = coerceLocalDayKeyOrToday(route.params?.date);
    const { items, busy, loaded, reload, add, toggleDone, setReminder, remove, clearCompleted, reorderOpen } = useDayTodos(day);
    const [draft, setDraft] = useState('');
    const [showCompleted, setShowCompleted] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reminderPickerId, setReminderPickerId] = useState(null);
    const didFlushPerfReportRef = useRef(false);
    useFocusEffect(useCallback(() => {
        if (perfProbe.enabled)
            didFlushPerfReportRef.current = false;
        return () => {
            if (perfProbe.enabled && !didFlushPerfReportRef.current) {
                didFlushPerfReportRef.current = true;
                perfProbe.flushReport('TodoScreen.blur');
            }
        };
    }, []));
    const { open, done } = useMemo(() => partitionDayTodos(items), [items]);
    const timedCount = useMemo(() => countOpenWithReminder(items), [items]);
    const progressLabel = useMemo(() => dayTodoProgressLabel(open.length, done.length), [open.length, done.length]);
    const atItemCap = items.length >= DAY_TODO_MAX_ITEMS_PER_DAY;
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        void reload().finally(() => {
            setRefreshing(false);
            haptics.select();
        });
    }, [reload]);
    const styles = useMemo(() => StyleSheet.create({
        container: { flex: 1, backgroundColor: s.background },
        scrollContent: {
            paddingTop: spacing[6],
            paddingHorizontal: CONTENT_GUTTER,
            paddingBottom: spacing[6],
            flexGrow: 1,
        },
        hero: {
            marginBottom: spacing[4],
        },
        datePrimary: {
            ...typography.title3,
            color: s.label,
            fontWeight: '600',
        },
        dateSecondary: {
            ...typography.body,
            color: s.secondaryLabel,
            marginTop: spacing[1],
            lineHeight: 20,
        },
        progressMuted: {
            marginTop: spacing[3],
            ...typography.footnote,
            fontWeight: '500',
            color: s.tertiaryLabel,
            fontVariant: ['tabular-nums'],
        },
        sectionLabel: {
            ...typography.caption1,
            fontWeight: '600',
            color: s.secondaryLabel,
            letterSpacing: 0.48,
            textTransform: 'uppercase',
            marginBottom: spacing[2],
            marginTop: spacing[5],
        },
        dragHint: {
            ...typography.footnote,
            color: s.secondaryLabel,
            marginBottom: spacing[3],
            lineHeight: 18,
        },
        completedSectionTitle: {
            ...typography.footnote,
            fontWeight: '500',
            color: s.tertiaryLabel,
            letterSpacing: 0.2,
        },
        card: {
            backgroundColor: s.secondaryBackground,
            borderRadius: borderRadius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: s.separator,
            overflow: 'hidden',
        },
        emptyCard: {
            paddingVertical: spacing[8],
            paddingHorizontal: spacing[2],
            alignItems: 'center',
        },
        emptyTitle: {
            ...typography.headline,
            color: s.label,
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: spacing[3],
        },
        emptyBody: {
            ...typography.callout,
            color: s.secondaryLabel,
            textAlign: 'center',
            lineHeight: 24,
            maxWidth: 300,
        },
        footnote: {
            ...typography.caption1,
            color: s.tertiaryLabel,
            marginTop: spacing[6],
            lineHeight: 17,
            textAlign: 'center',
        },
        clearDoneBtn: {
            alignSelf: 'center',
            marginTop: spacing[6],
            paddingVertical: spacing[3],
            paddingHorizontal: spacing[4],
        },
        clearDoneText: {
            ...typography.footnote,
            color: s.red,
            fontWeight: '600',
            opacity: 0.95,
        },
        toggleDone: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: spacing[6],
            paddingVertical: spacing[3],
            paddingRight: spacing[1],
        },
        composerBand: {
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: s.separator,
            backgroundColor: s.background,
            paddingHorizontal: CONTENT_GUTTER,
            paddingTop: spacing[3],
        },
        addRow: {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: borderRadius.lg,
            paddingHorizontal: spacing[4],
            minHeight: 50,
            backgroundColor: s.secondaryBackground,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: s.separator,
        },
        addIcon: {
            marginRight: spacing[3],
        },
        addInput: {
            flex: 1,
            ...typography.body,
            color: s.label,
            paddingVertical: spacing[3],
            minWidth: 0,
        },
        capHint: {
            ...typography.caption1,
            color: s.tertiaryLabel,
            marginTop: spacing[3],
            textAlign: 'center',
            opacity: 0.85,
        },
    }), [s]);
    const commitAdd = useCallback(async () => {
        const t = draft.trim();
        if (!t || busy || atItemCap)
            return;
        setDraft('');
        await add(t);
        haptics.success();
    }, [add, atItemCap, busy, draft]);
    const onClearCompleted = useCallback(() => {
        if (done.length === 0)
            return;
        Alert.alert('Clear completed', `Remove ${done.length} completed ${done.length === 1 ? 'reminder' : 'reminders'} for ${formatDateForDisplay(day)}? This can’t be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear',
                style: 'destructive',
                onPress: () => {
                    void clearCompleted().then(() => haptics.success());
                },
            },
        ]);
    }, [clearCompleted, day, done.length]);
    const onDragEnd = useCallback(async ({ data }) => {
        await reorderOpen(data.map((x) => x.id));
        haptics.success();
    }, [reorderOpen]);
    const onEditReminder = useCallback((id) => {
        haptics.select();
        setReminderPickerId(id);
    }, []);
    const listExtraData = useMemo(() => ({
        openCount: open.length,
        doneCount: done.length,
        showCompleted,
        reminderSignature: items.map((x) => `${x.id}:${x.reminderMinutes ?? 'x'}`).join(','),
        doneSignature: items.map((x) => `${x.id}:${x.done ? 1 : 0}`).join(','),
    }), [done.length, items, open.length, showCompleted]);
    const keyboardAvoidingStyle = useMemo(() => ({ flex: 1 }), []);
    const dragListContainerStyle = useMemo(() => ({ flex: 1, backgroundColor: s.background }), [s.background]);
    const renderOpenItem = useCallback(({ item, getIndex, drag, isActive }) => (_jsx(ScaleDecorator, { activeScale: a11y.reduceMotion ? 1 : 1.02, children: _jsx(TodoTaskRow, { item: item, dayKey: day, showSeparator: (getIndex() ?? 0) > 0, drag: drag, isDragging: isActive, onEditReminder: onEditReminder, onToggle: (id, next) => void toggleDone(id, next), onDelete: (id) => void remove(id) }) })), [a11y.reduceMotion, day, onEditReminder, remove, toggleDone]);
    const ListHeader = useCallback(() => (_jsxs(View, { children: [_jsxs(View, { style: styles.hero, children: [_jsx(Text, { style: styles.datePrimary, maxFontSizeMultiplier: 1.3, children: formatDateForDisplay(day) }), _jsxs(Text, { style: styles.dateSecondary, maxFontSizeMultiplier: 1.34, children: [getRelativeDayLabel(day), " \u00B7 gentle nudges for this day only (no push alerts yet)"] }), progressLabel ? (_jsx(Text, { style: styles.progressMuted, accessibilityRole: "text", maxFontSizeMultiplier: 1.28, children: progressLabel })) : null, timedCount > 0 ? (_jsxs(Text, { style: styles.progressMuted, accessibilityRole: "text", maxFontSizeMultiplier: 1.28, children: [timedCount, " with a time \u00B7 tap the clock on a row to change"] })) : null] }), _jsx(Text, { style: styles.sectionLabel, accessibilityRole: "header", allowFontScaling: true, maxFontSizeMultiplier: 1.28, children: "Open reminders" }), open.length > 0 ? (_jsx(Text, { style: styles.dragHint, allowFontScaling: true, maxFontSizeMultiplier: 1.3, children: "Hold the reorder grip to drag. Swipe left to delete. Tap the clock to set a time-of-day nudge." })) : null, open.length === 0 ? (_jsxs(View, { style: [styles.card, styles.emptyCard], children: [_jsx(Text, { style: styles.emptyTitle, maxFontSizeMultiplier: 1.28, children: loaded ? (done.length > 0 ? 'All caught up' : 'Nothing here yet') : '…' }), _jsx(Text, { style: styles.emptyBody, maxFontSizeMultiplier: 1.32, children: loaded
                            ? done.length > 0
                                ? 'Everything for today is checked off. Finished reminders stay below—expand the section when you need them.'
                                : 'Add something you want to remember today, then optionally tap the clock on a row to pin a time. Pull down to refresh if you edited on another screen.'
                            : 'Loading' }), _jsx(Text, { style: styles.footnote, maxFontSizeMultiplier: 1.32, children: "Each calendar day keeps its own list\u2014useful when you are planning around a journal entry, a trip, or one focused block of work." })] })) : null] })), [day, done.length, loaded, open.length, progressLabel, styles, timedCount]);
    const ListFooter = useCallback(() => done.length > 0 ? (_jsxs(View, { children: [_jsxs(Touchable, { onPress: () => {
                    haptics.select();
                    setShowCompleted((v) => !v);
                }, style: styles.toggleDone, accessibilityRole: "button", accessibilityLabel: showCompleted ? 'Hide completed tasks' : 'Show completed tasks', accessibilityState: { expanded: showCompleted }, children: [_jsxs(Text, { style: styles.completedSectionTitle, accessibilityRole: "header", maxFontSizeMultiplier: 1.28, children: ["Completed (", done.length, ")"] }), _jsx(Ionicons, { name: showCompleted ? 'chevron-up' : 'chevron-down', size: 18, color: s.tertiaryLabel, accessibilityElementsHidden: true, importantForAccessibility: "no" })] }), showCompleted ? (_jsx(View, { style: styles.card, children: done.map((it, i) => (_jsx(TodoTaskRow, { item: it, dayKey: day, showSeparator: i > 0, onToggle: (id, next) => void toggleDone(id, next), onDelete: (id) => void remove(id) }, it.id))) })) : null, _jsx(Touchable, { onPress: onClearCompleted, style: styles.clearDoneBtn, accessibilityRole: "button", accessibilityLabel: "Clear all completed tasks for this day", children: _jsx(Text, { style: styles.clearDoneText, children: "Clear completed" }) })] })) : null, [day, done, onClearCompleted, remove, showCompleted, s, styles, toggleDone]);
    const back = (_jsx(Touchable, { onPress: () => {
            haptics.select();
            navigation.goBack();
        }, accessibilityRole: "button", accessibilityLabel: "Back", hitSlop: { top: 12, bottom: 12, right: 12, left: 12 }, style: ({ pressed }) => ({ opacity: pressed ? 0.55 : 1 }), children: _jsx(Ionicons, { name: "chevron-back", size: 24, color: s.blue, accessibilityElementsHidden: true, importantForAccessibility: "no" }) }));
    const composerBottomPad = Math.max(insets.bottom, spacing[3]);
    return (_jsxs(SafeAreaView, { style: styles.container, edges: ['top'], children: [_jsx(ScreenHeader, { title: "Reminders", showSettings: false, leftAccessory: back, titleVisualSize: "compact", contentPaddingHorizontal: CONTENT_GUTTER }), _jsxs(KeyboardAvoidingView, { style: keyboardAvoidingStyle, behavior: Platform.OS === 'ios' ? 'padding' : 'height', keyboardVerticalOffset: 0, children: [_jsx(DraggableFlatList, { data: open, keyExtractor: (it) => it.id, renderItem: renderOpenItem, onDragBegin: () => haptics.sheet(), onDragEnd: onDragEnd, activationDistance: 14, extraData: listExtraData, containerStyle: dragListContainerStyle, contentContainerStyle: styles.scrollContent, ListHeaderComponent: ListHeader, ListFooterComponent: ListFooter, keyboardDismissMode: "interactive", keyboardShouldPersistTaps: "handled", showsVerticalScrollIndicator: false, refreshControl: _jsx(RefreshControl, { refreshing: refreshing, onRefresh: onRefresh, tintColor: s.tertiaryLabel }) }), _jsxs(View, { style: [styles.composerBand, { paddingBottom: composerBottomPad }], children: [_jsxs(View, { style: styles.addRow, children: [_jsx(Ionicons, { name: "add-circle", size: 24, color: s.blue, style: styles.addIcon, accessibilityElementsHidden: true, importantForAccessibility: "no" }), _jsx(TextInput, { value: draft, onChangeText: setDraft, placeholder: atItemCap ? 'List full' : 'New reminder…', placeholderTextColor: s.tertiaryLabel, style: styles.addInput, maxFontSizeMultiplier: 1.34, maxLength: MAX_DAY_TODO_TITLE_LEN, editable: !busy && !atItemCap, accessibilityLabel: "New reminder", accessibilityHint: `Adds a reminder for ${formatDateForDisplay(day)}`, returnKeyType: "done", blurOnSubmit: false, onSubmitEditing: () => void commitAdd() })] }), loaded ? (_jsx(Text, { style: styles.capHint, maxFontSizeMultiplier: 1.28, children: atItemCap
                                    ? `${DAY_TODO_MAX_ITEMS_PER_DAY} reminders max per day`
                                    : `Up to ${MAX_DAY_TODO_TITLE_LEN} characters · in-app times only (no notification yet)` })) : null] })] }), _jsx(TodoReminderPicker, { visible: reminderPickerId != null, selectedMinutes: reminderPickerId ? (items.find((x) => x.id === reminderPickerId)?.reminderMinutes ?? null) : null, onRequestClose: () => setReminderPickerId(null), onSelect: (m) => {
                    if (reminderPickerId)
                        void setReminder(reminderPickerId, m);
                } })] }));
}
