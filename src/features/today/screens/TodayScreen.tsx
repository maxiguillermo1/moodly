/**
 * @fileoverview Today screen - iOS-style mood entry
 * @module features/today/screens/TodayScreen
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useMoodEntry } from '@/hooks/useMoodEntry';
import { useScrollDrivenTabBarVisibility } from '@/hooks/useScrollDrivenTabBarVisibility';
import { useShowTabBarOnScreenBlur } from '@/hooks/useShowTabBarOnScreenBlur';
import { useTodayKey } from '@/hooks/useTodayKey';
import {
  ScreenHeader,
  MoodEntryFields,
  TodayExtensionsPanel,
  screenHeaderPrimaryTabPaddingX,
} from '@/components';
import { formatDateForDisplay } from '@/utils';
import { spacing, borderRadius, typography, useAppTheme } from '@/theme';
import { usePerfScreen } from '@/perf';
import { Touchable } from '@/ui/Touchable';
import { haptics } from '@/system/haptics';
import { announceForAccessibility } from '@/system/accessibility';

export default function TodayScreen() {
  usePerfScreen('Today');
  const {
    showTabBar,
    onScrollBeginDrag,
    onScrollEndDrag,
    onMomentumScrollBegin,
    onMomentumScrollEnd,
  } = useScrollDrivenTabBarVisibility();
  useShowTabBarOnScreenBlur(showTabBar);
  const { system: s } = useAppTheme();
  /** Mood sheet + extensions share this margin; matches {@link screenHeaderPrimaryTabPaddingX}. */
  const todayGutter = screenHeaderPrimaryTabPaddingX;
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
          flexGrow: 1,
          paddingBottom: 120,
        },
        /** Mood + note card only; extensions below stay flush (see {@link TodayExtensionsPanel}). */
        sheet: {
          marginTop: spacing[6],
          marginHorizontal: todayGutter,
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
        extensionsPanel: {
          marginHorizontal: todayGutter,
          marginTop: spacing[4],
        },
      }),
    [s, todayGutter]
  );

  const { todayKey: today } = useTodayKey();
  const [saveMessage, setSaveMessage] = useState('');
  const saveMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSaveMessageTimeout = useCallback(() => {
    if (saveMessageTimeoutRef.current) {
      clearTimeout(saveMessageTimeoutRef.current);
      saveMessageTimeoutRef.current = null;
    }
  }, []);

  const {
    mood,
    note,
    setMood,
    setNote,
    load,
    save,
  } = useMoodEntry({
    date: today,
    onSaveSuccess: () => {
      haptics.success();
      clearSaveMessageTimeout();
      setSaveMessage('✓ Saved');
      announceForAccessibility('Saved');
      saveMessageTimeoutRef.current = setTimeout(() => {
        saveMessageTimeoutRef.current = null;
        setSaveMessage('');
      }, 2000);
    },
    onSaveError: () => {
      haptics.error();
      Alert.alert('Error', 'Failed to save. Please try again.');
    },
  });

  useFocusEffect(
    useCallback(() => {
      clearSaveMessageTimeout();
      setSaveMessage('');
      // `useMoodEntry.load` peeks session RAM first — no InteractionManager defer on tab return.
      void load();
      return () => {
        clearSaveMessageTimeout();
      };
    }, [clearSaveMessageTimeout, load, today])
  );

  useEffect(() => {
    return () => {
      clearSaveMessageTimeout();
    };
  }, [clearSaveMessageTimeout]);

  const handleSave = useCallback(async () => {
    if (!mood) {
      Alert.alert('Pick a mood', 'Choose a mood before saving.');
      return;
    }
    await save();
  }, [mood, save]);

  const scrollBody = (
    <>
      <ScreenHeader title="Today" contentPaddingHorizontal={todayGutter} />

      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle} maxFontSizeMultiplier={1.32}>
            {formatDateForDisplay(today)}
          </Text>
          <Touchable
            onPress={handleSave}
            disabled={!mood}
            accessibilityRole="button"
            accessibilityLabel="Save"
            accessibilityHint="Saves today’s mood and note"
            accessibilityState={{ disabled: !mood }}
            hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            style={({ pressed }) => [pressed ? styles.pressedOpacity : null]}
          >
            <Text style={[styles.sheetSave, !mood && styles.sheetSaveDisabled]} maxFontSizeMultiplier={1.3}>
              Save
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
                <Text style={styles.saveMessage} maxFontSizeMultiplier={1.3} accessibilityLiveRegion="polite">
                  {saveMessage}
                </Text>
              ) : null
            }
          />
        </View>
      </View>

      <TodayExtensionsPanel date={today} style={styles.extensionsPanel} />
    </>
  );

  const scroll = (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      onScrollBeginDrag={onScrollBeginDrag}
      onScrollEndDrag={onScrollEndDrag}
      onMomentumScrollBegin={onMomentumScrollBegin}
      onMomentumScrollEnd={onMomentumScrollEnd}
    >
      {scrollBody}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {Platform.OS === 'ios' ? scroll : <KeyboardAvoidingView style={styles.flex} behavior="height">{scroll}</KeyboardAvoidingView>}
    </SafeAreaView>
  );
}
