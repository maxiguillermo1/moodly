/**
 * @fileoverview Shared mood + note block (Today card, calendar sheet, journal editor).
 * @module components/mood/MoodEntryFields
 */

import React, { useMemo } from 'react';
import { Text, TextInput, StyleSheet, type TextInput as RNTextInput } from 'react-native';

import type { MoodGrade } from '../../types';
import { spacing, borderRadius, typography, useAppTheme } from '../../theme';
import { MoodPicker } from './MoodPicker';

export type MoodEntryFieldsProps = {
  selectedMood: MoodGrade | null;
  onSelectMood: (grade: MoodGrade) => void;
  note: string;
  onChangeNote: (text: string) => void;
  /** Default `true` — segmented control (calendar sheet / production polish). */
  moodPickerCompact?: boolean;
  notePlaceholder?: string;
  noteMaxLength?: number;
  noteInputRef?: React.Ref<RNTextInput | null>;
  /** Rendered after the note field (e.g. Today habit chips). */
  belowNote?: React.ReactNode;
  footer?: React.ReactNode;
};

export function MoodEntryFields({
  selectedMood,
  onSelectMood,
  note,
  onChangeNote,
  moodPickerCompact = true,
  notePlaceholder = 'Add a short note…',
  noteMaxLength = 200,
  noteInputRef,
  belowNote,
  footer,
}: MoodEntryFieldsProps): React.ReactElement {
  const { system: s } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
      }),
    [s]
  );

  return (
    <>
      <Text style={styles.sectionLabel} allowFontScaling maxFontSizeMultiplier={1.28}>
        Mood
      </Text>
      <MoodPicker selectedMood={selectedMood} onSelect={onSelectMood} compact={moodPickerCompact} />

      <Text style={styles.noteSectionLabel} allowFontScaling maxFontSizeMultiplier={1.28}>
        Note
      </Text>
      <TextInput
        ref={noteInputRef}
        style={styles.noteInput}
        placeholder={notePlaceholder}
        placeholderTextColor={s.tertiaryLabel}
        value={note}
        onChangeText={onChangeNote}
        maxLength={noteMaxLength}
        multiline
        accessibilityLabel="Note"
        accessibilityHint={`Optional note, ${noteMaxLength} character limit`}
        autoCapitalize="sentences"
        autoCorrect
        textAlignVertical="top"
        returnKeyType="default"
        maxFontSizeMultiplier={1.35}
      />
      {belowNote}
      {footer}
    </>
  );
}
