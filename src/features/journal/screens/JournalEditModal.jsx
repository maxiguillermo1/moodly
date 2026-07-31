import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Journal edit modal UI (pageSheet).
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, KeyboardAvoidingView, Platform, InteractionManager, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoodEntryFields, SheetGrabber, TodayExtensionsPanel } from '@/components';
import { formatDateForDisplay } from '@/utils';
import { spacing, typography, useAppTheme } from '@/theme';
import { Touchable } from '@/ui/Touchable';
import { haptics } from '@/system/haptics';
import { announceForAccessibility, isScreenReaderEnabled } from '@/system/accessibility';
export function JournalEditModal(props) {
    const { editingEntry, editMood, editNote, setEditMood, setEditNote, onCancel, onSave } = props;
    const { system: s, a11y } = useAppTheme();
    const prevVisibleRef = useRef(false);
    const noteInputRef = useRef(null);
    /** Match {@link TodayScreen} sheet: margin `spacing[6]` + inner padding `spacing[4]`. */
    const dayEditHorizontalInset = spacing[6] + spacing[4];
    const saveDisabled = !editMood;
    const styles = useMemo(() => StyleSheet.create({
        modalContainer: {
            flex: 1,
            backgroundColor: s.background,
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: dayEditHorizontalInset,
            paddingVertical: spacing[4],
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: s.separator,
            backgroundColor: s.secondaryBackground,
        },
        modalCancel: {
            ...typography.body,
            color: s.secondaryLabel,
        },
        modalTitle: {
            ...typography.headline,
            color: s.label,
        },
        modalSave: {
            ...typography.body,
            color: s.blue,
            fontWeight: '600',
        },
        modalSaveDisabled: {
            color: s.tertiaryLabel,
        },
        modalContent: {
            paddingVertical: spacing[4],
            paddingHorizontal: dayEditHorizontalInset,
        },
        modalScrollContent: {
            flexGrow: 1,
            /** Room to scroll past habits + keyboard without feeling clipped (aligned with Today tab clearance). */
            paddingBottom: 120,
        },
        modalHabitExtensions: {
            marginTop: spacing[4],
        },
        pressedOpacity: { opacity: 0.7 },
    }), [s, dayEditHorizontalInset]);
    useEffect(() => {
        const visible = editingEntry !== null;
        const prev = prevVisibleRef.current;
        prevVisibleRef.current = visible;
        if (visible && !prev) {
            haptics.sheet();
            const interaction = InteractionManager.runAfterInteractions(() => {
                requestAnimationFrame(() => {
                    void isScreenReaderEnabled().then((enabled) => {
                        if (enabled) {
                            announceForAccessibility(`Editing ${formatDateForDisplay(editingEntry.date)}`);
                            return;
                        }
                        noteInputRef.current?.focus();
                    });
                });
            });
            return () => {
                interaction.cancel?.();
            };
        }
        // Dismiss: intentionally no second sheet haptic (open-only keeps the sheet calm — avoids “double thud”).
        return undefined;
    }, [editingEntry]);
    return (_jsx(Modal, { visible: editingEntry !== null, animationType: a11y.reduceMotion ? 'none' : 'slide', presentationStyle: "pageSheet", onRequestClose: onCancel, onDismiss: onCancel, children: _jsxs(SafeAreaView, { style: styles.modalContainer, edges: ['top', 'bottom'], accessibilityViewIsModal: true, children: [_jsx(SheetGrabber, {}), _jsxs(View, { style: styles.modalHeader, children: [_jsx(Touchable, { onPress: onCancel, accessibilityRole: "button", accessibilityLabel: "Cancel", accessibilityHint: "Closes the editor without saving", hitSlop: { top: 10, left: 10, right: 10, bottom: 10 }, style: ({ pressed }) => (pressed ? styles.pressedOpacity : undefined), children: _jsx(Text, { style: styles.modalCancel, allowFontScaling: true, maxFontSizeMultiplier: 1.3, children: "Cancel" }) }), _jsx(Text, { style: styles.modalTitle, allowFontScaling: true, numberOfLines: 1, maxFontSizeMultiplier: 1.3, accessibilityRole: "header", children: editingEntry ? formatDateForDisplay(editingEntry.date) : '' }), _jsx(Touchable, { onPress: onSave, disabled: saveDisabled, accessibilityRole: "button", accessibilityLabel: saveDisabled ? 'Save, disabled' : 'Save', accessibilityHint: saveDisabled ? 'Choose a mood before saving' : 'Saves mood and note changes', accessibilityState: { disabled: saveDisabled }, hitSlop: { top: 10, left: 10, right: 10, bottom: 10 }, style: ({ pressed }) => (pressed ? styles.pressedOpacity : undefined), children: _jsx(Text, { style: [styles.modalSave, saveDisabled && styles.modalSaveDisabled], allowFontScaling: true, maxFontSizeMultiplier: 1.3, children: "Save" }) })] }), _jsx(KeyboardAvoidingView, { style: { flex: 1 }, behavior: Platform.OS === 'ios' ? 'padding' : 'height', keyboardVerticalOffset: 0, children: _jsx(ScrollView, { style: { flex: 1 }, keyboardShouldPersistTaps: "handled", keyboardDismissMode: "interactive", contentContainerStyle: styles.modalScrollContent, showsVerticalScrollIndicator: false, nestedScrollEnabled: true, children: _jsxs(View, { style: styles.modalContent, children: [_jsx(MoodEntryFields, { selectedMood: editMood, onSelectMood: setEditMood, note: editNote, onChangeNote: setEditNote, moodPickerCompact: true, noteInputRef: noteInputRef }), editingEntry ? (_jsx(TodayExtensionsPanel, { date: editingEntry.date, insetVariant: "nested", style: styles.modalHabitExtensions, onBeforeDetailNavigate: onCancel })) : null] }) }) })] }) }));
}
