/**
 * @fileoverview Today screen - iOS-style mood entry
 * @module screens/TodayScreen
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useMoodEntry } from '../hooks';
import { ScreenHeader, MoodPicker } from '../components';
import { getToday, formatDateForDisplay } from '../utils';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function TodayScreen() {
  const today = getToday();
  const [saveMessage, setSaveMessage] = useState('');

  const {
    mood,
    note,
    isSaving,
    setMood,
    setNote,
    load,
    save,
  } = useMoodEntry({
    date: today,
    onSaveSuccess: () => {
      setSaveMessage('✓ Saved');
      setTimeout(() => setSaveMessage(''), 2000);
    },
    onSaveError: () => {
      Alert.alert('Error', 'Failed to save. Please try again.');
    },
  });

  useFocusEffect(
    useCallback(() => {
      load();
      setSaveMessage('');
    }, [load])
  );

  const handleSave = async () => {
    if (!mood) {
      Alert.alert('Select a mood', 'Please pick how your day was before saving.');
      return;
    }
    await save();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="Today" />

          {/* Journal-style edit sheet UI */}
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{formatDateForDisplay(today)}</Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!mood || isSaving}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Save"
              >
                <Text style={[styles.sheetSave, (!mood || isSaving) && styles.sheetSaveDisabled]}>
                  {isSaving ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sheetContent}>
              <MoodPicker selectedMood={mood} onSelect={setMood} />

              <View style={styles.noteSection}>
                <Text style={styles.noteLabel}>NOTE</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="What made today special?"
                  placeholderTextColor={colors.system.tertiaryLabel}
                  value={note}
                  onChangeText={setNote}
                  maxLength={200}
                  multiline
                />
              </View>

              {saveMessage ? <Text style={styles.saveMessage}>{saveMessage}</Text> : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.system.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Space for floating nav
  },

  // Journal-style sheet container
  sheet: {
    marginHorizontal: spacing[4],
    backgroundColor: colors.system.secondaryBackground,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.system.separator,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.system.separator,
    backgroundColor: colors.system.secondaryBackground,
  },
  sheetTitle: {
    ...typography.headline,
    color: colors.system.label,
  },
  sheetSave: {
    ...typography.body,
    color: colors.system.blue,
    fontWeight: '600',
  },
  sheetSaveDisabled: {
    color: colors.system.secondaryLabel,
  },
  sheetContent: {
    padding: spacing[4],
  },

  noteSection: {
    marginTop: spacing[6],
  },
  noteLabel: {
    ...typography.footnote,
    color: colors.system.secondaryLabel,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  noteInput: {
    ...typography.body,
    color: colors.system.label,
    backgroundColor: colors.system.background,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    minHeight: 110,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.system.separator,
  },
  saveMessage: {
    ...typography.subhead,
    color: colors.system.green,
    textAlign: 'center',
    marginTop: spacing[4],
  },
});
