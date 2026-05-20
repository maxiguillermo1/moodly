/**
 * @fileoverview Calendar quick-edit modal (pageSheet).
 * @module features/calendar/components/CalendarEditModal
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MoodGrade } from '@/types';
import { MoodEntryFields, SheetGrabber } from '@/components';
import { formatDateForDisplay } from '@/utils';
import { spacing, typography, useAppTheme } from '@/theme';
import { Touchable } from '@/ui/Touchable';
import { haptics } from '@/system/haptics';

export type CalendarEditModalProps = {
  visible: boolean;
  selectedDate: string;
  editMood: MoodGrade | null;
  editNote: string;
  isSaving: boolean;
  setEditMood: (next: MoodGrade | null) => void;
  setEditNote: (next: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function CalendarEditModal({
  visible,
  selectedDate,
  editMood,
  editNote,
  isSaving,
  setEditMood,
  setEditNote,
  onCancel,
  onSave,
}: CalendarEditModalProps): React.ReactElement {
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
      }),
    [s]
  );

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
    } else if (!visible && prev) {
      haptics.sheet();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <SheetGrabber />
          <View style={styles.modalHeader}>
            <Touchable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
              style={(state) => [state?.pressed ? styles.pressedOpacity : null]}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </Touchable>
            <Text style={styles.modalTitle} allowFontScaling numberOfLines={1}>
              {formatDateForDisplay(selectedDate)}
            </Text>
            <Touchable
              onPress={onSave}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Save"
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
              style={(state) => [state?.pressed ? styles.pressedOpacity : null]}
            >
              <Text style={styles.modalSave}>{isSaving ? 'Saving…' : 'Save'}</Text>
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
