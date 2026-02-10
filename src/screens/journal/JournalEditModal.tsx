/**
 * Journal edit modal UI (pageSheet).
 *
 * Responsibility:
 * - Render the edit UI for a single `MoodEntry` (mood picker + note field).
 * - Emit user intent via callbacks (cancel/save, set mood/note).
 *
 * Must NOT:
 * - Read/write storage
 * - Compute aggregates
 * - Perform navigation
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MoodEntry, MoodGrade } from '../../types';
import { MoodPicker } from '../../components';
import { formatDateForDisplay } from '../../utils';
import { colors, spacing, borderRadius, typography } from '../../theme';

export function JournalEditModal(props: {
  editingEntry: MoodEntry | null;
  editMood: MoodGrade | null;
  editNote: string;
  setEditMood: (next: MoodGrade | null) => void;
  setEditNote: (next: string) => void;
  onCancel: () => void;
  onSave: () => void;
}): React.ReactElement {
  const { editingEntry, editMood, editNote, setEditMood, setEditNote, onCancel, onSave } = props;

  return (
    <Modal
      visible={editingEntry !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onCancel} activeOpacity={0.7} accessibilityRole="button">
            <Text style={styles.modalCancel} allowFontScaling>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle} allowFontScaling>
            {editingEntry ? formatDateForDisplay(editingEntry.date) : ''}
          </Text>
          <TouchableOpacity onPress={onSave} activeOpacity={0.7} accessibilityRole="button">
            <Text style={styles.modalSave} allowFontScaling>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <MoodPicker selectedMood={editMood} onSelect={setEditMood} />

          <View style={styles.modalNoteSection}>
            <Text style={styles.modalNoteLabel} allowFontScaling>
              NOTE
            </Text>
            <TextInput
              style={styles.modalNoteInput}
              placeholder="What made this day special?"
              placeholderTextColor={colors.system.tertiaryLabel}
              value={editNote}
              onChangeText={setEditNote}
              maxLength={200}
              multiline
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.system.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.system.separator,
    backgroundColor: colors.system.secondaryBackground,
  },
  modalCancel: {
    ...typography.body,
    color: colors.system.secondaryLabel,
  },
  modalTitle: {
    ...typography.headline,
    color: colors.system.label,
  },
  modalSave: {
    ...typography.body,
    color: colors.system.blue,
    fontWeight: '600',
  },
  modalContent: {
    padding: spacing[4],
  },
  modalNoteSection: {
    marginTop: spacing[6],
  },
  modalNoteLabel: {
    ...typography.footnote,
    color: colors.system.secondaryLabel,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  modalNoteInput: {
    ...typography.body,
    color: colors.system.label,
    backgroundColor: colors.system.secondaryBackground,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

