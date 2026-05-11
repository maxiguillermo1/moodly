/**
 * @fileoverview Today screen - iOS-style mood entry
 * @module screens/TodayScreen
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useMoodEntry } from '../hooks';
import { ScreenHeader, MoodEntryFields } from '../components';
import { getToday, formatDateForDisplay } from '../utils';
import { spacing, borderRadius, typography, useAppTheme } from '../theme';
import { usePerfScreen } from '../perf';
import { Touchable } from '../ui/Touchable';
import { haptics } from '../system/haptics';

export default function TodayScreen() {
  usePerfScreen('Today');
  const { system: s } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: s.background,
        },
        flex: {
          flex: 1,
        },
        scrollContent: {
          paddingBottom: 120,
        },
        sheet: {
          marginHorizontal: spacing[3],
          backgroundColor: s.secondaryBackground,
          borderRadius: borderRadius.xl,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: s.separator,
          overflow: 'hidden',
        },
        sheetHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[4],
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: s.separator,
          backgroundColor: s.secondaryBackground,
        },
        sheetTitle: {
          ...typography.headline,
          color: s.label,
        },
        sheetSave: {
          ...typography.body,
          color: s.blue,
          fontWeight: '600',
        },
        sheetSaveDisabled: {
          color: s.tertiaryLabel,
        },
        pressedOpacity: { opacity: 0.7 },
        sheetContent: {
          padding: spacing[4],
          backgroundColor: s.background,
        },
        saveMessage: {
          ...typography.subhead,
          color: s.green,
          textAlign: 'center',
          marginTop: spacing[4],
        },
      }),
    [s]
  );

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
      haptics.success();
      setSaveMessage('✓ Saved');
      setTimeout(() => setSaveMessage(''), 2000);
    },
    onSaveError: () => {
      haptics.error();
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
      Alert.alert('Pick a mood', 'Choose a mood before saving.');
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
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="Today" />

          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} maxFontSizeMultiplier={1.32}>
                {formatDateForDisplay(today)}
              </Text>
              <Touchable
                onPress={handleSave}
                disabled={!mood || isSaving}
                accessibilityRole="button"
                accessibilityLabel="Save"
                hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
                style={({ pressed }) => [pressed ? styles.pressedOpacity : null]}
              >
                <Text style={[styles.sheetSave, (!mood || isSaving) && styles.sheetSaveDisabled]} maxFontSizeMultiplier={1.3}>
                  {isSaving ? 'Saving…' : 'Save'}
                </Text>
              </Touchable>
            </View>

            <View style={styles.sheetContent}>
              <MoodEntryFields
                selectedMood={mood}
                onSelectMood={setMood}
                note={note}
                onChangeNote={setNote}
                moodPickerCompact
                footer={
                  saveMessage ? (
                    <Text style={styles.saveMessage} maxFontSizeMultiplier={1.3}>
                      {saveMessage}
                    </Text>
                  ) : null
                }
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
