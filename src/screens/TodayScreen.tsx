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
import { getToday, formatDateForDisplay } from '../lib/utils/date';
import { colors, spacing, borderRadius, typography } from '../theme';

export default function TodayScreen() {
  const today = getToday();
  const [saveMessage, setSaveMessage] = useState('');

  const {
    mood,
    note,
    isExisting,
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

          {/* Date subtitle */}
          <Text style={styles.dateText}>{formatDateForDisplay(today)}</Text>

          {/* Mood Picker Card */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Mood</Text>
            <MoodPicker selectedMood={mood} onSelect={setMood} compact />
          </View>

          {/* Note Input Card */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Note</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="What made today special?"
              placeholderTextColor={colors.system.tertiaryLabel}
              value={note}
              onChangeText={setNote}
              maxLength={200}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, !mood && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!mood || isSaving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : isExisting ? 'Update Entry' : 'Save Entry'}
            </Text>
          </TouchableOpacity>

          {/* Save Message */}
          {saveMessage ? (
            <Text style={styles.saveMessage}>{saveMessage}</Text>
          ) : null}
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
  dateText: {
    ...typography.subhead,
    color: colors.system.secondaryLabel,
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  card: {
    backgroundColor: colors.system.secondaryBackground,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    padding: spacing[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.system.separator,
  },
  sectionLabel: {
    ...typography.footnote,
    color: colors.system.secondaryLabel,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },
  noteInput: {
    ...typography.body,
    color: colors.system.label,
    backgroundColor: colors.system.background,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.system.separator,
  },
  saveButton: {
    backgroundColor: colors.system.blue,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing[4],
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.system.gray3,
  },
  saveButtonText: {
    ...typography.headline,
    color: '#fff',
  },
  saveMessage: {
    ...typography.subhead,
    color: colors.system.green,
    textAlign: 'center',
    marginTop: spacing[3],
  },
});
