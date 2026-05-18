/**
 * Journal edit modal UI (pageSheet).
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MoodEntry, MoodGrade } from '@/types';
import { MoodEntryFields, SheetGrabber, TodayExtensionsPanel } from '@/components';
import { formatDateForDisplay } from '@/utils';
import { spacing, typography, useAppTheme } from '@/theme';
import { Touchable } from '@/ui/Touchable';
import { haptics } from '@/system/haptics';
import { announceForAccessibility, isScreenReaderEnabled } from '@/system/accessibility';

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
  const { system: s, a11y } = useAppTheme();
  const prevVisibleRef = useRef(false);
  const noteInputRef = useRef<TextInput | null>(null);

  /** Match {@link TodayScreen} sheet: margin `spacing[6]` + inner padding `spacing[4]`. */
  const dayEditHorizontalInset = spacing[6] + spacing[4];

  const saveDisabled = !editMood;

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
      }),
    [s, dayEditHorizontalInset]
  );

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

  return (
    <Modal
      visible={editingEntry !== null}
      animationType={a11y.reduceMotion ? 'none' : 'slide'}
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
      onDismiss={onCancel}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']} accessibilityViewIsModal>
        <SheetGrabber />
        <View style={styles.modalHeader}>
          <Touchable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            accessibilityHint="Closes the editor without saving"
            hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            style={({ pressed }) => (pressed ? styles.pressedOpacity : undefined)}
          >
            <Text style={styles.modalCancel} allowFontScaling maxFontSizeMultiplier={1.3}>
              Cancel
            </Text>
          </Touchable>
          <Text
            style={styles.modalTitle}
            allowFontScaling
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            accessibilityRole="header"
          >
            {editingEntry ? formatDateForDisplay(editingEntry.date) : ''}
          </Text>
          <Touchable
            onPress={onSave}
            disabled={saveDisabled}
            accessibilityRole="button"
            accessibilityLabel={saveDisabled ? 'Save, disabled' : 'Save'}
            accessibilityHint={saveDisabled ? 'Choose a mood before saving' : 'Saves mood and note changes'}
            accessibilityState={{ disabled: saveDisabled }}
            hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            style={({ pressed }) => (pressed ? styles.pressedOpacity : undefined)}
          >
            <Text
              style={[styles.modalSave, saveDisabled && styles.modalSaveDisabled]}
              allowFontScaling
              maxFontSizeMultiplier={1.3}
            >
              Save
            </Text>
          </Touchable>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={styles.modalContent}>
              <MoodEntryFields
                selectedMood={editMood}
                onSelectMood={setEditMood}
                note={editNote}
                onChangeNote={setEditNote}
                moodPickerCompact
                noteInputRef={noteInputRef}
              />
              {editingEntry ? (
                <TodayExtensionsPanel
                  date={editingEntry.date}
                  insetVariant="nested"
                  style={styles.modalHabitExtensions}
                  onBeforeDetailNavigate={onCancel}
                />
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
