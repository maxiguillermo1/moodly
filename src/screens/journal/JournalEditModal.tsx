/**
 * Journal edit modal UI (pageSheet).
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MoodEntry, MoodGrade } from '../../types';
import { MoodEntryFields, SheetGrabber } from '../../components';
import { formatDateForDisplay } from '../../utils';
import { spacing, typography, useAppTheme } from '../../theme';
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
  const { system: s } = useAppTheme();
  const prevVisibleRef = useRef(false);
  const noteInputRef = useRef<TextInput | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        modalContainer: {
          flex: 1,
          backgroundColor: s.background,
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
        pressedOpacity: { opacity: 0.7 },
      }),
    [s]
  );

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
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        <SheetGrabber />
        <View style={styles.modalHeader}>
          <Touchable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            style={({ pressed }) => (pressed ? styles.pressedOpacity : undefined)}
          >
            <Text style={styles.modalCancel} allowFontScaling maxFontSizeMultiplier={1.3}>
              Cancel
            </Text>
          </Touchable>
          <Text style={styles.modalTitle} allowFontScaling numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {editingEntry ? formatDateForDisplay(editingEntry.date) : ''}
          </Text>
          <Touchable
            onPress={onSave}
            accessibilityRole="button"
            accessibilityLabel="Save"
            hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            style={({ pressed }) => (pressed ? styles.pressedOpacity : undefined)}
          >
            <Text style={styles.modalSave} allowFontScaling maxFontSizeMultiplier={1.3}>
              Save
            </Text>
          </Touchable>
        </View>

        <View style={styles.modalContent}>
          <MoodEntryFields
            selectedMood={editMood}
            onSelectMood={setEditMood}
            note={editNote}
            onChangeNote={setEditNote}
            moodPickerCompact
            noteInputRef={noteInputRef}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
