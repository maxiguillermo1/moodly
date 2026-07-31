import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview Calendar quick-edit modal (pageSheet).
 * @module features/calendar/components/CalendarEditModal
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Modal, KeyboardAvoidingView, Platform, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoodEntryFields, SheetGrabber } from '@/components';
import { formatDateForDisplay } from '@/utils';
import { spacing, typography, useAppTheme } from '@/theme';
import { Touchable } from '@/ui/Touchable';
import { haptics } from '@/system/haptics';
export function CalendarEditModal({ visible, selectedDate, editMood, editNote, isSaving, setEditMood, setEditNote, onCancel, onSave, }) {
    const { system: s } = useAppTheme();
    const prevVisibleRef = useRef(false);
    const noteInputRef = useRef(null);
    const styles = useMemo(() => StyleSheet.create({
        modalContainer: {
            flex: 1,
            backgroundColor: s.background,
        },
        modalKeyboard: {
            flex: 1,
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[4],
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: s.separator,
            backgroundColor: s.secondaryBackground,
        },
        pressedOpacity: { opacity: 0.7 },
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
        modalContent: {
            padding: spacing[4],
        },
    }), [s]);
    useEffect(() => {
        const prev = prevVisibleRef.current;
        prevVisibleRef.current = visible;
        if (visible && !prev) {
            haptics.sheet();
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    noteInputRef.current?.focus();
                });
            });
        }
        else if (!visible && prev) {
            haptics.sheet();
        }
    }, [visible]);
    return (_jsx(Modal, { visible: visible, animationType: "slide", presentationStyle: "pageSheet", onRequestClose: onCancel, children: _jsx(SafeAreaView, { style: styles.modalContainer, edges: ['top', 'bottom'], children: _jsxs(KeyboardAvoidingView, { style: styles.modalKeyboard, behavior: Platform.OS === 'ios' ? 'padding' : undefined, keyboardVerticalOffset: Platform.OS === 'ios' ? 8 : 0, children: [_jsx(SheetGrabber, {}), _jsxs(View, { style: styles.modalHeader, children: [_jsx(Touchable, { onPress: onCancel, accessibilityRole: "button", accessibilityLabel: "Cancel", hitSlop: { top: 10, left: 10, right: 10, bottom: 10 }, style: (state) => [state?.pressed ? styles.pressedOpacity : null], children: _jsx(Text, { style: styles.modalCancel, children: "Cancel" }) }), _jsx(Text, { style: styles.modalTitle, allowFontScaling: true, numberOfLines: 1, children: formatDateForDisplay(selectedDate) }), _jsx(Touchable, { onPress: onSave, disabled: isSaving, accessibilityRole: "button", accessibilityLabel: "Save", hitSlop: { top: 10, left: 10, right: 10, bottom: 10 }, style: (state) => [state?.pressed ? styles.pressedOpacity : null], children: _jsx(Text, { style: styles.modalSave, children: isSaving ? 'Saving…' : 'Save' }) })] }), _jsx(View, { style: styles.modalContent, children: _jsx(MoodEntryFields, { selectedMood: editMood, onSelectMood: setEditMood, note: editNote, onChangeNote: setEditNote, moodPickerCompact: true, noteInputRef: noteInputRef }) })] }) }) }));
}
