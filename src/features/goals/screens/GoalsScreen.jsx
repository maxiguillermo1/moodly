import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * @fileoverview Goals — calm long-term progress hub.
 * @module features/goals/screens/GoalsScreen
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LiquidGlass, ScreenHeader, screenHeaderPrimaryTabPaddingX } from '@/components';
import { addGoalProgress, archiveGoal, deleteGoal, upsertGoal } from '@/storage';
import { computeGoalProgress, formatDateForDisplay, getToday, goalLoggedDayCount, isValidLocalCalendarDayKey, } from '@/utils';
import { useGoalsFocusLoad } from '@/hooks';
import { borderRadius, spacing, typography, useAppTheme } from '@/theme';
import { Touchable } from '@/ui/Touchable';
import { usePerfScreen } from '@/perf';
import { haptics } from '@/system/haptics';
const CONTENT_GUTTER = screenHeaderPrimaryTabPaddingX;
const HERO_WELL = 28;
const GOAL_TYPES = ['habit', 'target', 'average', 'project'];
const CATEGORIES = ['health', 'fitness', 'learning', 'work', 'wellness', 'personal'];
function labelForType(type) {
    if (type === 'habit')
        return 'Habit';
    if (type === 'target')
        return 'Daily target';
    if (type === 'average')
        return 'Average';
    return 'Project';
}
function labelForCategory(category) {
    return category[0].toUpperCase() + category.slice(1);
}
function lengthLabel(goal) {
    if (goal.durationDays === undefined)
        return null;
    const logged = goalLoggedDayCount(goal.history);
    if (goal.durationDays === null)
        return `${logged} ${logged === 1 ? 'day' : 'days'} logged · Never ending`;
    return `${logged} of ${goal.durationDays} days`;
}
export default function GoalsScreen() {
    usePerfScreen('Goals');
    const navigation = useNavigation();
    const route = useRoute();
    const { system: s, isDark } = useAppTheme();
    const routeDate = route.params?.date;
    const dateHint = typeof routeDate === 'string' && isValidLocalCalendarDayKey(routeDate)
        ? formatDateForDisplay(routeDate)
        : null;
    const [isComposerOpen, setComposerOpen] = useState(false);
    const [draftTitle, setDraftTitle] = useState('');
    const [draftType, setDraftType] = useState('habit');
    const [draftCategory, setDraftCategory] = useState('personal');
    const [draftTarget, setDraftTarget] = useState('1');
    const [loggingGoal, setLoggingGoal] = useState(null);
    const [logValue, setLogValue] = useState('1');
    const [logNote, setLogNote] = useState('');
    const [lengthGoal, setLengthGoal] = useState(null);
    const [lengthDraft, setLengthDraft] = useState('');
    const { goals, reload } = useGoalsFocusLoad();
    const active = useMemo(() => goals.filter((goal) => goal.status === 'active'), [goals]);
    const completed = useMemo(() => goals.filter((goal) => goal.status === 'completed'), [goals]);
    const archived = useMemo(() => goals.filter((goal) => goal.status === 'archived'), [goals]);
    const goalProgressById = useMemo(() => {
        const out = new Map();
        for (const goal of goals)
            out.set(goal.id, computeGoalProgress(goal));
        return out;
    }, [goals]);
    const styles = useMemo(() => StyleSheet.create({
        container: { flex: 1, backgroundColor: s.background },
        scroll: {
            flexGrow: 1,
            paddingTop: spacing[6],
            paddingBottom: 120,
            paddingHorizontal: CONTENT_GUTTER,
        },
        heroCard: {
            backgroundColor: s.secondaryBackground,
            borderRadius: borderRadius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: s.separator,
            padding: spacing[4],
            marginBottom: spacing[4],
        },
        heroTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing[2],
        },
        well: {
            width: HERO_WELL,
            height: HERO_WELL,
            borderRadius: HERO_WELL / 2,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing[2],
        },
        heroTitle: {
            ...typography.subhead,
            fontWeight: '600',
            color: s.label,
            flex: 1,
        },
        heroBody: {
            ...typography.callout,
            color: s.secondaryLabel,
            lineHeight: 20,
        },
        dateHint: {
            ...typography.footnote,
            color: s.tertiaryLabel,
            marginTop: spacing[2],
        },
        addButton: {
            marginTop: spacing[4],
            borderRadius: borderRadius.lg,
            paddingVertical: spacing[3],
            alignItems: 'center',
            backgroundColor: s.fill,
        },
        addText: {
            ...typography.subhead,
            color: s.blue,
            fontWeight: '600',
        },
        sectionTitle: {
            ...typography.caption1,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: s.secondaryLabel,
            fontWeight: '600',
            marginTop: spacing[5],
            marginBottom: spacing[2],
        },
        goalCard: {
            backgroundColor: s.secondaryBackground,
            borderRadius: borderRadius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: s.separator,
            padding: spacing[4],
            marginBottom: spacing[2],
        },
        goalTop: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        goalText: {
            flex: 1,
            minWidth: 0,
        },
        goalTitle: {
            ...typography.headline,
            color: s.label,
            fontWeight: '600',
        },
        goalMeta: {
            ...typography.footnote,
            color: s.secondaryLabel,
            marginTop: 2,
        },
        progressTrack: {
            height: 5,
            borderRadius: 3,
            backgroundColor: s.fill,
            overflow: 'hidden',
            marginTop: spacing[3],
        },
        progressFill: {
            height: 5,
            borderRadius: 3,
        },
        insight: {
            ...typography.footnote,
            color: s.tertiaryLabel,
            marginTop: spacing[2],
            lineHeight: 17,
        },
        emptyCard: {
            backgroundColor: s.secondaryBackground,
            borderRadius: borderRadius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: s.separator,
            paddingVertical: spacing[8],
            paddingHorizontal: spacing[4],
            alignItems: 'center',
        },
        emptyTitle: {
            ...typography.title3,
            color: s.label,
            fontWeight: '600',
            marginBottom: spacing[2],
            textAlign: 'center',
        },
        emptyBody: {
            ...typography.body,
            color: s.secondaryLabel,
            textAlign: 'center',
            lineHeight: 22,
        },
        modalBackdrop: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.25)',
            justifyContent: 'flex-end',
        },
        modalAvoider: {
            flex: 1,
            justifyContent: 'flex-end',
        },
        sheetScroll: {
            maxHeight: '88%',
        },
        sheetScrollContent: {
            flexGrow: 1,
            justifyContent: 'flex-end',
        },
        sheet: {
            padding: spacing[4],
        },
        sheetGlass: {
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
        },
        input: {
            ...typography.body,
            color: s.label,
            minHeight: 48,
            borderRadius: borderRadius.lg,
            backgroundColor: s.tertiaryFill,
            paddingHorizontal: spacing[4],
            marginTop: spacing[3],
        },
        inputDisabled: {
            color: s.secondaryLabel,
            opacity: 0.82,
        },
        textArea: {
            minHeight: 92,
            paddingTop: spacing[3],
            paddingBottom: spacing[3],
            textAlignVertical: 'top',
        },
        sheetCaption: {
            ...typography.callout,
            color: s.secondaryLabel,
            lineHeight: 20,
            marginTop: spacing[2],
        },
        fieldLabel: {
            ...typography.caption1,
            textTransform: 'uppercase',
            letterSpacing: 0.45,
            fontWeight: '600',
            color: s.secondaryLabel,
            marginTop: spacing[4],
        },
        pillRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing[2],
            marginTop: spacing[3],
        },
        pill: {
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[2],
            borderRadius: 999,
            backgroundColor: s.fill,
        },
        pillSelected: {
            backgroundColor: isDark ? 'rgba(255, 149, 0, 0.24)' : 'rgba(255, 149, 0, 0.16)',
        },
        pillText: {
            ...typography.footnote,
            color: s.secondaryLabel,
            fontWeight: '600',
        },
        saveRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: spacing[5],
        },
        sheetButton: {
            paddingVertical: spacing[3],
            paddingHorizontal: spacing[4],
        },
        sheetButtonText: {
            ...typography.body,
            color: s.blue,
            fontWeight: '600',
        },
    }), [isDark, s]);
    const closeComposer = useCallback(() => {
        setComposerOpen(false);
        setDraftTitle('');
        setDraftType('habit');
        setDraftCategory('personal');
        setDraftTarget('1');
    }, []);
    const closeLogger = useCallback(() => {
        setLoggingGoal(null);
        setLogValue('1');
        setLogNote('');
    }, []);
    const closeLengthEditor = useCallback(() => {
        setLengthGoal(null);
        setLengthDraft('');
    }, []);
    const saveGoal = useCallback(async () => {
        const title = draftTitle.trim();
        if (!title)
            return;
        const target = Math.max(1, Number(draftTarget) || 1);
        try {
            await upsertGoal({
                title,
                type: draftType,
                category: draftCategory,
                accentColor: '#FF9500',
                progress: {
                    currentValue: 0,
                    targetValue: target,
                    unit: draftType === 'target' ? 'per day' : draftType === 'habit' ? 'times' : '',
                    frequency: draftType === 'habit' || draftType === 'target' ? 'daily' : 'none',
                },
            });
            haptics.success();
            closeComposer();
            await reload();
        }
        catch {
            haptics.error();
            Alert.alert('Error', 'Could not save this goal. Please try again.');
        }
    }, [closeComposer, draftCategory, draftTarget, draftTitle, draftType, reload]);
    const openGoalLogger = useCallback((goal) => {
        haptics.select();
        const date = routeDate && isValidLocalCalendarDayKey(routeDate) ? routeDate : getToday();
        const existing = goal.history.find((item) => item.date === date) ?? null;
        setLoggingGoal(goal);
        setLogValue(existing ? String(existing.value) : goal.type === 'target' || goal.type === 'average' ? '' : '1');
        setLogNote(existing?.note ?? '');
    }, [routeDate]);
    const saveGoalLog = useCallback(async () => {
        if (!loggingGoal)
            return;
        const date = routeDate && isValidLocalCalendarDayKey(routeDate) ? routeDate : getToday();
        const existing = loggingGoal.history.find((item) => item.date === date) ?? null;
        const value = loggingGoal.type === 'habit' ? 1 : Math.max(0, Number(logValue) || 0);
        if (!existing && value <= 0) {
            Alert.alert('Add an amount', 'Enter what you completed for this day.');
            return;
        }
        try {
            await addGoalProgress(loggingGoal.id, date, value, logNote);
            haptics.success();
            closeLogger();
            await reload();
        }
        catch {
            haptics.error();
            Alert.alert('Error', 'Could not log this goal. Please try again.');
        }
    }, [closeLogger, logNote, logValue, loggingGoal, reload, routeDate]);
    const updateGoalDuration = useCallback(async (goal, durationDays) => {
        try {
            await upsertGoal({
                id: goal.id,
                title: goal.title,
                type: goal.type,
                status: durationDays === null && goal.status === 'completed' ? 'active' : goal.status,
                category: goal.category,
                customCategory: goal.customCategory,
                accentColor: goal.accentColor,
                progress: goal.progress,
                reminder: goal.reminder,
                milestones: goal.milestones,
                history: goal.history,
                notes: goal.notes,
                durationDays,
                completedAt: durationDays === null ? null : goal.completedAt,
                archivedAt: goal.archivedAt,
            });
            haptics.success();
            await reload();
        }
        catch {
            haptics.error();
            Alert.alert('Error', 'Could not update this goal length. Please try again.');
        }
    }, [reload]);
    const saveLength = useCallback(async () => {
        if (!lengthGoal)
            return;
        const days = Math.floor(Number(lengthDraft));
        if (!Number.isFinite(days) || days <= 0) {
            Alert.alert('Goal length', 'Enter a positive number of days, or choose Never ending.');
            return;
        }
        await updateGoalDuration(lengthGoal, days);
        closeLengthEditor();
    }, [closeLengthEditor, lengthDraft, lengthGoal, updateGoalDuration]);
    const openLengthEditor = useCallback((goal) => {
        setLengthGoal(goal);
        setLengthDraft(typeof goal.durationDays === 'number' ? String(goal.durationDays) : '');
    }, []);
    const onArchive = useCallback(async (goal) => {
        await archiveGoal(goal.id);
        haptics.select();
        await reload();
    }, [reload]);
    const onResume = useCallback(async (goal) => {
        try {
            await upsertGoal({
                id: goal.id,
                title: goal.title,
                type: goal.type,
                status: 'active',
                category: goal.category,
                customCategory: goal.customCategory,
                accentColor: goal.accentColor,
                progress: goal.progress,
                reminder: goal.reminder,
                milestones: goal.milestones,
                history: goal.history,
                notes: goal.notes,
                durationDays: goal.durationDays,
                completedAt: null,
                archivedAt: null,
            });
            haptics.success();
            await reload();
        }
        catch {
            haptics.error();
            Alert.alert('Error', 'Could not resume this goal. Please try again.');
        }
    }, [reload]);
    const onDelete = useCallback((goal) => {
        Alert.alert('Delete goal', `Delete “${goal.title}”? This removes its logs and can’t be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    void deleteGoal(goal.id)
                        .then(async () => {
                        haptics.success();
                        await reload();
                    })
                        .catch(() => {
                        haptics.error();
                        Alert.alert('Error', 'Could not delete this goal. Please try again.');
                    });
                },
            },
        ]);
    }, [reload]);
    const openGoalOptions = useCallback((goal) => {
        haptics.select();
        const options = goal.status === 'archived'
            ? [
                { text: 'Resume', onPress: () => void onResume(goal) },
                { text: 'Change length', onPress: () => openLengthEditor(goal) },
                { text: 'Never ending', onPress: () => void updateGoalDuration(goal, null) },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(goal) },
                { text: 'Cancel', style: 'cancel' },
            ]
            : [
                { text: 'Change length', onPress: () => openLengthEditor(goal) },
                { text: 'Never ending', onPress: () => void updateGoalDuration(goal, null) },
                { text: 'Archive / pause', onPress: () => void onArchive(goal) },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(goal) },
                { text: 'Cancel', style: 'cancel' },
            ];
        Alert.alert('Goal options', goal.status === 'archived' ? `${goal.title} is paused.` : goal.title, options);
    }, [onArchive, onDelete, onResume, openLengthEditor, updateGoalDuration]);
    const back = (_jsx(Touchable, { onPress: () => {
            haptics.select();
            navigation.goBack();
        }, accessibilityRole: "button", accessibilityLabel: "Back", hitSlop: { top: 12, bottom: 12, right: 12, left: 12 }, style: ({ pressed }) => ({ opacity: pressed ? 0.55 : 1 }), children: _jsx(Ionicons, { name: "chevron-back", size: 24, color: s.blue, accessibilityElementsHidden: true, importantForAccessibility: "no" }) }));
    const wellBg = isDark ? 'rgba(255, 149, 0, 0.22)' : 'rgba(255, 149, 0, 0.15)';
    const loggingDate = routeDate && isValidLocalCalendarDayKey(routeDate) ? routeDate : getToday();
    const existingLog = loggingGoal?.history.find((item) => item.date === loggingDate) ?? null;
    const renderGoal = (goal) => {
        const computed = goalProgressById.get(goal.id);
        const pct = Math.round(computed.percent);
        const durationLabel = lengthLabel(goal);
        return (_jsx(Touchable, { onPress: () => (goal.status === 'archived' ? openGoalOptions(goal) : openGoalLogger(goal)), onLongPress: () => openGoalOptions(goal), accessibilityRole: "button", accessibilityLabel: `${goal.title}, ${pct}% complete`, accessibilityHint: goal.status === 'archived' ? 'Opens paused goal options.' : 'Opens a daily goal log. Long press for length, pause, and delete options.', children: _jsxs(View, { style: styles.goalCard, children: [_jsxs(View, { style: styles.goalTop, children: [_jsxs(View, { style: styles.goalText, children: [_jsx(Text, { style: styles.goalTitle, maxFontSizeMultiplier: 1.28, children: goal.title }), _jsxs(Text, { style: styles.goalMeta, maxFontSizeMultiplier: 1.3, children: [labelForType(goal.type), " \u00B7 ", labelForCategory(goal.category), " \u00B7 ", pct, "%", durationLabel ? ` · ${durationLabel}` : '', goal.status === 'archived' ? ' · Paused' : ''] })] }), _jsx(Text, { style: styles.goalMeta, maxFontSizeMultiplier: 1.2, children: computed.streak > 0 ? `${computed.streak}d` : '' })] }), _jsx(View, { style: styles.progressTrack, children: _jsx(View, { style: [styles.progressFill, { width: `${Math.min(100, pct)}%`, backgroundColor: goal.accentColor }] }) }), _jsx(Text, { style: styles.insight, maxFontSizeMultiplier: 1.3, children: computed.insight.message })] }) }, goal.id));
    };
    return (_jsxs(SafeAreaView, { style: styles.container, edges: ['top', 'bottom'], children: [_jsx(ScreenHeader, { title: "Goals", showSettings: false, leftAccessory: back, titleVisualSize: "compact", contentPaddingHorizontal: CONTENT_GUTTER }), _jsxs(ScrollView, { style: { flex: 1, backgroundColor: s.background }, contentContainerStyle: styles.scroll, contentInsetAdjustmentBehavior: "automatic", showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: "handled", children: [_jsxs(View, { style: styles.heroCard, children: [_jsxs(View, { style: styles.heroTitleRow, children: [_jsx(View, { style: [styles.well, { backgroundColor: wellBg }], children: _jsx(Ionicons, { name: "flag-outline", size: 16, color: s.orange, accessibilityElementsHidden: true, importantForAccessibility: "no" }) }), _jsx(Text, { style: styles.heroTitle, maxFontSizeMultiplier: 1.28, accessibilityRole: "header", children: "Goals" })] }), _jsx(Text, { style: styles.heroBody, maxFontSizeMultiplier: 1.32, children: "Gentle long-term progress, kept lightweight. Tap a goal to log what happened for the day." }), dateHint ? _jsxs(Text, { style: styles.dateHint, maxFontSizeMultiplier: 1.3, children: ["Opened for ", dateHint] }) : null, _jsx(Touchable, { style: styles.addButton, onPress: () => setComposerOpen(true), accessibilityRole: "button", accessibilityLabel: "Add goal", children: _jsx(Text, { style: styles.addText, maxFontSizeMultiplier: 1.25, children: "Add a small goal" }) })] }), active.length === 0 ? (_jsxs(View, { style: styles.emptyCard, children: [_jsx(Text, { style: styles.emptyTitle, maxFontSizeMultiplier: 1.3, children: "Start with one small goal." }), _jsx(Text, { style: styles.emptyBody, maxFontSizeMultiplier: 1.32, children: "Progress grows gently over time." })] })) : (_jsxs(_Fragment, { children: [_jsx(Text, { style: styles.sectionTitle, children: "Active" }), active.map(renderGoal)] })), completed.length > 0 ? (_jsxs(_Fragment, { children: [_jsx(Text, { style: styles.sectionTitle, children: "Completed" }), completed.map(renderGoal)] })) : null, archived.length > 0 ? (_jsxs(_Fragment, { children: [_jsx(Text, { style: styles.sectionTitle, children: "Paused" }), archived.map(renderGoal)] })) : null] }), _jsx(Modal, { visible: isComposerOpen, transparent: true, animationType: "slide", onRequestClose: closeComposer, children: _jsx(View, { style: styles.modalBackdrop, children: _jsx(KeyboardAvoidingView, { style: styles.modalAvoider, behavior: Platform.OS === 'ios' ? 'padding' : 'height', keyboardVerticalOffset: 0, children: _jsx(ScrollView, { style: styles.sheetScroll, contentContainerStyle: styles.sheetScrollContent, keyboardShouldPersistTaps: "handled", keyboardDismissMode: "interactive", showsVerticalScrollIndicator: false, children: _jsx(LiquidGlass, { style: styles.sheetGlass, radius: borderRadius.xl, intensity: 72, prominent: true, children: _jsxs(View, { style: styles.sheet, accessibilityViewIsModal: true, children: [_jsx(Text, { style: styles.goalTitle, accessibilityRole: "header", maxFontSizeMultiplier: 1.3, children: "New goal" }), _jsx(TextInput, { value: draftTitle, onChangeText: setDraftTitle, placeholder: "What feels worth nurturing?", placeholderTextColor: s.tertiaryLabel, style: styles.input, maxFontSizeMultiplier: 1.3, returnKeyType: "next", accessibilityLabel: "Goal title" }), _jsx(View, { style: styles.pillRow, children: GOAL_TYPES.map((type) => (_jsx(Touchable, { style: [styles.pill, draftType === type ? styles.pillSelected : null], onPress: () => setDraftType(type), accessibilityRole: "button", accessibilityState: { selected: draftType === type }, accessibilityLabel: `Goal type ${labelForType(type)}`, children: _jsx(Text, { style: styles.pillText, children: labelForType(type) }) }, type))) }), _jsx(View, { style: styles.pillRow, children: CATEGORIES.map((category) => (_jsx(Touchable, { style: [styles.pill, draftCategory === category ? styles.pillSelected : null], onPress: () => setDraftCategory(category), accessibilityRole: "button", accessibilityState: { selected: draftCategory === category }, accessibilityLabel: `Goal category ${labelForCategory(category)}`, children: _jsx(Text, { style: styles.pillText, children: labelForCategory(category) }) }, category))) }), _jsx(TextInput, { value: draftTarget, onChangeText: setDraftTarget, placeholder: draftType === 'target' ? 'Daily target' : 'Target', placeholderTextColor: s.tertiaryLabel, keyboardType: "number-pad", style: styles.input, maxFontSizeMultiplier: 1.3, returnKeyType: "done", onSubmitEditing: () => void saveGoal(), accessibilityLabel: "Daily target" }), _jsxs(View, { style: styles.saveRow, children: [_jsx(Touchable, { style: styles.sheetButton, onPress: closeComposer, accessibilityRole: "button", accessibilityLabel: "Cancel new goal", children: _jsx(Text, { style: styles.sheetButtonText, children: "Cancel" }) }), _jsx(Touchable, { style: styles.sheetButton, onPress: () => void saveGoal(), accessibilityRole: "button", accessibilityLabel: "Save new goal", children: _jsx(Text, { style: styles.sheetButtonText, children: "Save" }) })] })] }) }) }) }) }) }), _jsx(Modal, { visible: loggingGoal != null, transparent: true, animationType: "slide", onRequestClose: closeLogger, children: _jsx(View, { style: styles.modalBackdrop, children: _jsx(KeyboardAvoidingView, { style: styles.modalAvoider, behavior: Platform.OS === 'ios' ? 'padding' : 'height', keyboardVerticalOffset: 0, children: _jsx(ScrollView, { style: styles.sheetScroll, contentContainerStyle: styles.sheetScrollContent, keyboardShouldPersistTaps: "handled", keyboardDismissMode: "interactive", showsVerticalScrollIndicator: false, children: _jsx(LiquidGlass, { style: styles.sheetGlass, radius: borderRadius.xl, intensity: 72, prominent: true, children: _jsxs(View, { style: styles.sheet, accessibilityViewIsModal: true, children: [_jsxs(Text, { style: styles.goalTitle, accessibilityRole: "header", maxFontSizeMultiplier: 1.3, children: ["Log for ", formatDateForDisplay(loggingDate)] }), _jsx(Text, { style: styles.sheetCaption, maxFontSizeMultiplier: 1.3, children: existingLog
                                                ? 'This day is already logged. You can edit the note without changing progress.'
                                                : loggingGoal?.type === 'target' || loggingGoal?.type === 'average'
                                                    ? `Enter the amount for ${loggingGoal.title} on this day.`
                                                    : `Mark ${loggingGoal?.title ?? 'this goal'} complete for this day.` }), loggingGoal?.type === 'target' || loggingGoal?.type === 'average' ? (_jsxs(_Fragment, { children: [_jsx(Text, { style: styles.fieldLabel, maxFontSizeMultiplier: 1.2, children: "Amount for this day" }), _jsx(TextInput, { value: logValue, onChangeText: setLogValue, placeholder: "0", placeholderTextColor: s.tertiaryLabel, keyboardType: "decimal-pad", style: [styles.input, existingLog ? styles.inputDisabled : null], editable: !existingLog, maxFontSizeMultiplier: 1.3, accessibilityLabel: "Goal amount for this day" })] })) : null, _jsx(Text, { style: styles.fieldLabel, maxFontSizeMultiplier: 1.2, children: "Note" }), _jsx(TextInput, { value: logNote, onChangeText: setLogNote, placeholder: "Add a short note\u2026", placeholderTextColor: s.tertiaryLabel, style: [styles.input, styles.textArea], maxFontSizeMultiplier: 1.3, multiline: true, textAlignVertical: "top", accessibilityLabel: "Goal log note" }), _jsxs(View, { style: styles.saveRow, children: [_jsx(Touchable, { style: styles.sheetButton, onPress: closeLogger, accessibilityRole: "button", accessibilityLabel: "Cancel goal log", children: _jsx(Text, { style: styles.sheetButtonText, children: "Cancel" }) }), _jsx(Touchable, { style: styles.sheetButton, onPress: () => void saveGoalLog(), accessibilityRole: "button", accessibilityLabel: "Save goal log", children: _jsx(Text, { style: styles.sheetButtonText, children: "Log" }) })] })] }) }) }) }) }) }), _jsx(Modal, { visible: lengthGoal != null, transparent: true, animationType: "slide", onRequestClose: closeLengthEditor, children: _jsx(View, { style: styles.modalBackdrop, children: _jsx(KeyboardAvoidingView, { style: styles.modalAvoider, behavior: Platform.OS === 'ios' ? 'padding' : 'height', keyboardVerticalOffset: 0, children: _jsx(ScrollView, { style: styles.sheetScroll, contentContainerStyle: styles.sheetScrollContent, keyboardShouldPersistTaps: "handled", keyboardDismissMode: "interactive", showsVerticalScrollIndicator: false, children: _jsx(LiquidGlass, { style: styles.sheetGlass, radius: borderRadius.xl, intensity: 72, prominent: true, children: _jsxs(View, { style: styles.sheet, accessibilityViewIsModal: true, children: [_jsx(Text, { style: styles.goalTitle, accessibilityRole: "header", maxFontSizeMultiplier: 1.3, children: "Goal length" }), _jsx(Text, { style: styles.sheetCaption, maxFontSizeMultiplier: 1.3, children: "Set how many logged days complete this goal, or choose never ending to use it as a day counter." }), _jsx(Text, { style: styles.fieldLabel, maxFontSizeMultiplier: 1.2, children: "Days" }), _jsx(TextInput, { value: lengthDraft, onChangeText: setLengthDraft, placeholder: "30", placeholderTextColor: s.tertiaryLabel, keyboardType: "number-pad", style: styles.input, maxFontSizeMultiplier: 1.3, accessibilityLabel: "Goal length in days" }), _jsx(Touchable, { style: styles.addButton, onPress: () => {
                                                if (lengthGoal)
                                                    void updateGoalDuration(lengthGoal, null).then(closeLengthEditor);
                                            }, accessibilityRole: "button", accessibilityLabel: "Make goal never ending", children: _jsx(Text, { style: styles.addText, maxFontSizeMultiplier: 1.25, children: "Never ending" }) }), _jsxs(View, { style: styles.saveRow, children: [_jsx(Touchable, { style: styles.sheetButton, onPress: closeLengthEditor, accessibilityRole: "button", accessibilityLabel: "Cancel goal length", children: _jsx(Text, { style: styles.sheetButtonText, children: "Cancel" }) }), _jsx(Touchable, { style: styles.sheetButton, onPress: () => void saveLength(), accessibilityRole: "button", accessibilityLabel: "Save goal length", children: _jsx(Text, { style: styles.sheetButtonText, children: "Save" }) })] })] }) }) }) }) }) })] }));
}
