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

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MoodEntry, MoodGrade } from '../../types';
import { MoodPicker } from '../../components';
import { formatDateForDisplay } from '../../utils';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { Touchable } from '../../ui/Touchable';
import { haptics } from '../../system/haptics';

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
  const prevVisibleRef = useRef(false);
  const noteInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    const visible = editingEntry !== null;
    const prev = prevVisibleRef.current;
    prevVisibleRef.current = visible;
    if (visible && !prev) {
      haptics.sheet();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          noteInputRef.current?.focus();
        });
      });
    } else if (!visible && prev) {
      haptics.sheet();
    }
  }, [editingEntry]);

  return (
    <Modal
      visible={editingEntry !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <Touchable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            style={({ pressed }) => (pressed ? styles.pressedOpacity : undefined)}
          >
            <Text style={styles.modalCancel} allowFontScaling>
              Cancel
            </Text>
          </Touchable>
          <Text style={styles.modalTitle} allowFontScaling>
            {editingEntry ? formatDateForDisplay(editingEntry.date) : ''}
          </Text>
          <Touchable
            onPress={onSave}
            accessibilityRole="button"
            accessibilityLabel="Save"
            hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            style={({ pressed }) => (pressed ? styles.pressedOpacity : undefined)}
          >
            <Text style={styles.modalSave} allowFontScaling>
              Save
            </Text>
          </Touchable>
        </View>

        <View style={styles.modalContent}>
          <MoodPicker selectedMood={editMood} onSelect={setEditMood} />

          <View style={styles.modalNoteSection}>
            <Text style={styles.modalNoteLabel} allowFontScaling>
              NOTE
            </Text>
            <TextInput
              ref={noteInputRef}
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
  pressedOpacity: { opacity: 0.7 },
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

