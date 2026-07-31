import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview Shared mood + note block (Today card, calendar sheet, journal editor).
 * @module components/mood/MoodEntryFields
 */
import React, { useMemo } from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';
import { spacing, borderRadius, typography, useAppTheme } from '../../theme';
import { MoodPicker } from './MoodPicker';
export const MoodEntryFields = React.memo(function MoodEntryFields({ selectedMood, onSelectMood, note, onChangeNote, moodPickerCompact = true, notePlaceholder = 'Add a short note…', noteMaxLength = 200, noteInputRef, belowNote, footer, }) {
    const { system: s } = useAppTheme();
    const styles = useMemo(() => StyleSheet.create({
        sectionLabel: {
            ...typography.footnote,
            color: s.secondaryLabel,
            textTransform: 'uppercase',
            marginBottom: spacing[2],
        },
        noteSectionLabel: {
            ...typography.footnote,
            color: s.secondaryLabel,
            textTransform: 'uppercase',
            marginBottom: spacing[2],
            marginTop: spacing[6],
        },
        noteInput: {
            ...typography.body,
            color: s.label,
            backgroundColor: s.secondaryBackground,
            borderRadius: borderRadius.lg,
            padding: spacing[4],
            minHeight: 120,
            textAlignVertical: 'top',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: s.separator,
        },
    }), [s]);
    return (_jsxs(_Fragment, { children: [_jsx(Text, { style: styles.sectionLabel, allowFontScaling: true, maxFontSizeMultiplier: 1.28, children: "Mood" }), _jsx(MoodPicker, { selectedMood: selectedMood, onSelect: onSelectMood, compact: moodPickerCompact }), _jsx(Text, { style: styles.noteSectionLabel, allowFontScaling: true, maxFontSizeMultiplier: 1.28, children: "Note" }), _jsx(TextInput, { ref: noteInputRef, style: styles.noteInput, placeholder: notePlaceholder, placeholderTextColor: s.tertiaryLabel, value: note, onChangeText: onChangeNote, maxLength: noteMaxLength, multiline: true, accessibilityLabel: "Note", accessibilityHint: `Optional note, ${noteMaxLength} character limit`, autoCapitalize: "sentences", autoCorrect: true, textAlignVertical: "top", returnKeyType: "default", maxFontSizeMultiplier: 1.35 }), belowNote, footer] }));
});
