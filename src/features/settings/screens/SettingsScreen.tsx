/**
 * @fileoverview Settings screen - iOS Settings app style
 * @module features/settings/screens/SettingsScreen
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  Platform,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import { useCloudSyncStatus } from '@/hooks/useCloudSyncStatus';
import {
  ScreenHeader,
  GroupedSection,
  GroupedRow,
  HabitsSettingsRow,
  GoalsTodaySettingsRow,
  TodoTodaySettingsRow,
} from '@/components';
import {
  exportUserDataJson,
  getMoodStats,
  importUserDataFromJson,
  pickJsonImport,
  clearAllUserJournalData,
  shareJsonExport,
} from '@/storage';
import { MOOD_GRADES, getMoodLabel, openExternalUrl } from '@/utils';
import { logger } from '@/security';
import { LEGAL_URLS } from '@/constants';
import { formatReleaseVersionLine } from '@/config/releaseMetadata';
import { perfProbe, usePerfScreen } from '@/perf';
import { MoodGrade, MoodGradeColorStyle } from '@/types';
import { spacing, useAppTheme } from '@/theme';
import { haptics } from '@/system/haptics';
import { formatMoodA11yLabel } from '@/system/accessibility';

export default function SettingsScreen() {
  usePerfScreen('Settings');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cloudEnabled, user, signOutUser } = useAuth();
  const { status: syncStatus } = useCloudSyncStatus();
  const {
    system: s,
    groupedCanvas,
    appearancePreference,
    setAppearancePreference,
    isDark,
    moodGradeColorStyle,
    setMoodGradeColorStyle,
    habitsEnabled,
    setHabitsEnabled,
    todayGoalsEnabled,
    setTodayGoalsEnabled,
    todayTodoEnabled,
    setTodayTodoEnabled,
  } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: groupedCanvas,
        },
        scrollContent: {
          paddingTop: spacing[2],
          paddingBottom: 120,
        },
      }),
    [groupedCanvas]
  );

  const groupedScrollSurfaceStyle = useMemo(() => ({ backgroundColor: groupedCanvas }), [groupedCanvas]);

  const [totalEntries, setTotalEntries] = useState(0);
  const [moodCounts, setMoodCounts] = useState<Record<MoodGrade, number>>({
    'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0,
  });

  const loadStatsCountRef = useRef(0);
  const didFlushPerfReportRef = useRef(false);

  const loadStats = useCallback(async () => {
    const phase = loadStatsCountRef.current === 0 ? 'cold' : 'warm';
    loadStatsCountRef.current += 1;
    const start = perfProbe.nowMs();
    const { totalEntries: total, moodCounts: counts } = await getMoodStats();
    setTotalEntries(total);
    setMoodCounts(counts);
    logger.perf('settings.loadStats', {
      phase,
      source: 'sessionCache',
      durationMs: Number((perfProbe.nowMs() - start).toFixed(1)),
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (perfProbe.enabled) didFlushPerfReportRef.current = false;
      const task = InteractionManager.runAfterInteractions(() => {
        void loadStats();
      });
      return () => {
        task.cancel();
        if (perfProbe.enabled && !didFlushPerfReportRef.current) {
          didFlushPerfReportRef.current = true;
          perfProbe.flushReport('SettingsScreen.blur');
        }
      };
    }, [loadStats])
  );

  const handleExportData = useCallback(() => {
    void (async () => {
      try {
        haptics.select();
        const json = await exportUserDataJson();
        await shareJsonExport(json);
      } catch {
        logger.warn('settings.export.failed');
        Alert.alert('Export failed', 'Could not create an export file. Please try again.');
      }
    })();
  }, []);

  const handleImportData = useCallback(() => {
    Alert.alert(
      'Import data',
      'This replaces mood, habit, goal, and reminder data on this device with the selected export file. Settings appearance preferences are kept unless the file includes them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                haptics.toggle();
                const json = await pickJsonImport();
                if (!json) return;
                await importUserDataFromJson(json);
                await loadStats();
                Alert.alert('Done', 'Your data was imported.');
              } catch {
                logger.warn('settings.import.failed');
                Alert.alert('Import failed', 'The file could not be imported. Check that it is a valid Kairo export.');
              }
            })();
          },
        },
      ]
    );
  }, [loadStats]);

  const handleClearData = useCallback(() => {
    const cloudSignedIn = cloudEnabled && Boolean(user);
    Alert.alert(
      'Clear All Data',
      cloudSignedIn
        ? 'This permanently deletes all mood, habit, goal, and reminder data on this device and in your cloud backup. Your account stays signed in.'
        : 'This will permanently delete all mood entries, habits, goals, and reminders on this device. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                haptics.toggle();
                await clearAllUserJournalData({ cloudUser: cloudSignedIn ? user : null });
                await loadStats();
                Alert.alert('Done', 'All journal data has been deleted.');
              } catch {
                logger.warn('settings.clearAll.failed');
                Alert.alert('Error', 'Failed to clear data. Please try again.');
              }
            })();
          },
        },
      ]
    );
  }, [cloudEnabled, loadStats, user]);

  const topMood = useMemo(() => {
    if (totalEntries === 0) return null;
    return MOOD_GRADES.reduce((a, b) => (moodCounts[a] > moodCounts[b] ? a : b));
  }, [moodCounts, totalEntries]);

  const setAppearance = useCallback(
    async (mode: Parameters<typeof setAppearancePreference>[0]) => {
      try {
        await setAppearancePreference(mode);
      } catch {
        logger.warn('settings.setAppearancePreference.failed', { mode });
        Alert.alert('Error', 'Failed to save appearance. Please try again.');
      }
    },
    [setAppearancePreference]
  );

  const handleAutomaticSwitch = useCallback(
    async (automatic: boolean) => {
      haptics.toggle();
      if (automatic) {
        await setAppearance('system');
        return;
      }
      await setAppearance(isDark ? 'dark' : 'light');
    },
    [isDark, setAppearance]
  );

  const handleDarkModeSwitch = useCallback(
    async (dark: boolean) => {
      if (appearancePreference === 'system') return;
      haptics.toggle();
      await setAppearance(dark ? 'dark' : 'light');
    },
    [appearancePreference, setAppearance]
  );

  const handleGradientSwitch = useCallback(
    async (gradient: boolean) => {
      const mode: MoodGradeColorStyle = gradient ? 'gradient' : 'solid';
      if (mode === moodGradeColorStyle) return;
      haptics.toggle();
      try {
        await setMoodGradeColorStyle(mode);
      } catch {
        logger.warn('settings.setMoodGradeColorStyle.failed', { mode });
        Alert.alert('Error', 'Failed to save preference. Please try again.');
      }
    },
    [moodGradeColorStyle, setMoodGradeColorStyle]
  );

  const switchTrack = { false: s.gray5, true: s.green } as const;
  const switchIosBg = s.gray5;
  const switchThumb = Platform.OS === 'android' ? s.secondaryBackground : undefined;

  const darkSwitchValue = appearancePreference === 'system' ? isDark : appearancePreference === 'dark';
  const darkSwitchDisabled = appearancePreference === 'system';

  const releaseVersionLine = useMemo(() => formatReleaseVersionLine(), []);

  const openLegalUrl = useCallback(async (url: string, label: string) => {
    haptics.select();
    await openExternalUrl(url, label);
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign out',
      'Local copies of your journal will be cleared from this device. Cloud data stays safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            haptics.select();
            void signOutUser().catch(() => {
              Alert.alert('Could not sign out', 'Please try again.');
            });
          },
        },
      ]
    );
  }, [signOutUser]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Settings" showSettings={false} />

      <ScrollView
        style={groupedScrollSurfaceStyle}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <GroupedSection header="Statistics">
          <GroupedRow
            symbol={{ name: 'stats-chart-outline', wellColor: s.blue }}
            label="Total Entries"
            value={String(totalEntries)}
            showChevron={false}
            isFirst
          />
          <GroupedRow
            symbol={{ name: 'trophy-outline', wellColor: s.orange }}
            label="Most Common Mood"
            value={topMood ? `${topMood}` : '—'}
            showChevron={false}
            isLast
          />
        </GroupedSection>

        <GroupedSection
          header="Appearance"
          footer="Automatic uses your device’s Light or Dark mode. Turn it off to pin Light or Dark with the switch below. Gradient adds the bloom ramp on mood surfaces (calendar, picker, badges)."
        >
          <GroupedRow
            symbol={{ name: 'contrast-outline', wellColor: s.indigo }}
            label="Automatic"
            showChevron={false}
            isFirst
            right={(
              <Switch
                value={appearancePreference === 'system'}
                onValueChange={(v) => void handleAutomaticSwitch(v)}
                trackColor={switchTrack}
                ios_backgroundColor={switchIosBg}
                thumbColor={switchThumb}
                accessibilityLabel="Match system appearance"
                accessibilityState={{ checked: appearancePreference === 'system' }}
              />
            )}
          />
          <GroupedRow
            symbol={{ name: 'moon-outline', wellColor: s.purple }}
            label="Dark Mode"
            showChevron={false}
            right={(
              <Switch
                value={darkSwitchValue}
                disabled={darkSwitchDisabled}
                onValueChange={(v) => void handleDarkModeSwitch(v)}
                trackColor={switchTrack}
                ios_backgroundColor={switchIosBg}
                thumbColor={switchThumb}
                accessibilityLabel="Dark appearance"
                accessibilityHint={darkSwitchDisabled ? 'Turn off Automatic to change light or dark' : undefined}
                accessibilityState={{ checked: darkSwitchValue, disabled: darkSwitchDisabled }}
              />
            )}
          />
          <GroupedRow
            symbol={{ name: 'color-filter-outline', wellColor: s.teal }}
            label="Gradient moods"
            showChevron={false}
            isLast
            right={(
              <Switch
                value={moodGradeColorStyle === 'gradient'}
                onValueChange={(v) => void handleGradientSwitch(v)}
                trackColor={switchTrack}
                ios_backgroundColor={switchIosBg}
                thumbColor={switchThumb}
                accessibilityLabel="Gradient mood colors"
                accessibilityState={{ checked: moodGradeColorStyle === 'gradient' }}
              />
            )}
          />
        </GroupedSection>

        <GroupedSection
          header="Extensions"
          footer="Extensions appear on the Today, Journal, and Calendar day editors when enabled. Tap Habits, Goals, or To-do to open their screen; use each switch to show or hide that section on Today."
        >
          <HabitsSettingsRow enabled={habitsEnabled} onToggle={setHabitsEnabled} isFirst isLast={false} />
          <GoalsTodaySettingsRow enabled={todayGoalsEnabled} onToggle={setTodayGoalsEnabled} isLast={false} />
          <TodoTodaySettingsRow enabled={todayTodoEnabled} onToggle={setTodayTodoEnabled} isLast />
        </GroupedSection>

        <GroupedSection header="Mood Breakdown">
          {MOOD_GRADES.map((grade, index) => {
            const count = moodCounts[grade];
            const percent = totalEntries > 0 ? Math.round((count / totalEntries) * 100) : 0;

            return (
              <GroupedRow
                key={grade}
                label={`${grade} — ${getMoodLabel(grade)}`}
                value={`${count} (${percent}%)`}
                accessibilityLabel={`${formatMoodA11yLabel(grade)}, ${count}, ${percent} percent`}
                showChevron={false}
                isFirst={index === 0}
                isLast={index === MOOD_GRADES.length - 1}
              />
            );
          })}
        </GroupedSection>

        <GroupedSection header="About">
          <GroupedRow
            symbol={{ name: 'information-circle-outline', wellColor: s.blue }}
            label="Version"
            value={releaseVersionLine}
            showChevron={false}
            isFirst
          />
          <GroupedRow
            symbol={{ name: 'heart-outline', wellColor: s.pink }}
            label="Made with"
            value="React Native + Expo"
            showChevron={false}
            isLast
          />
        </GroupedSection>

        <GroupedSection
          header="Account & sync"
          footer={
            cloudEnabled
              ? 'Sign in to keep your journal safe across devices, reinstalls, and new phones.'
              : 'Add Supabase env variables to enable cloud sync (see docs/SUPABASE.md).'
          }
        >
          <GroupedRow
            symbol={{ name: 'person-circle-outline', wellColor: s.blue }}
            label="Account"
            value={
              cloudEnabled
                ? user
                  ? syncStatus === 'syncing'
                    ? 'Syncing…'
                    : 'Signed in'
                  : 'Sign in'
                : 'Not configured'
            }
            onPress={() => navigation.navigate('Account')}
            accessibilityLabel="Account and cloud sync"
            accessibilityHint="Opens account sign in and sync settings"
            isFirst
            isLast={!(cloudEnabled && user)}
          />
          {cloudEnabled && user ? (
            <GroupedRow
              symbol={{ name: 'log-out-outline', wellColor: s.orange }}
              label="Sign out"
              destructive
              showChevron={false}
              onPress={handleSignOut}
              accessibilityLabel="Sign out"
              accessibilityHint="Signs out and returns to the sign in screen"
              isLast
            />
          ) : null}
        </GroupedSection>

        <GroupedSection
          header="Privacy & support"
          footer="Signed-in users store journal data in Supabase (encrypted in transit). Local export/import remains available for manual backups."
        >
          <GroupedRow
            symbol={{ name: 'shield-checkmark-outline', wellColor: s.teal }}
            label="Privacy Policy"
            onPress={() => void openLegalUrl(LEGAL_URLS.privacyPolicy, 'Privacy Policy')}
            accessibilityLabel="Privacy Policy"
            accessibilityHint="Opens the privacy policy in your browser"
            isFirst
          />
          <GroupedRow
            symbol={{ name: 'document-text-outline', wellColor: s.indigo }}
            label="Terms of Use"
            onPress={() => void openLegalUrl(LEGAL_URLS.termsOfUse, 'Terms of Use')}
            accessibilityLabel="Terms of Use"
            accessibilityHint="Opens the terms of use in your browser"
          />
          <GroupedRow
            symbol={{ name: 'mail-outline', wellColor: s.blue }}
            label="Support"
            onPress={() => void openLegalUrl(LEGAL_URLS.support, 'Support')}
            accessibilityLabel="Support"
            accessibilityHint="Opens support in your browser"
            isLast
          />
        </GroupedSection>

        <GroupedSection
          header="Data"
          footer="Export creates a JSON backup on this device. Import restores from a Kairo export file. Clear All Data permanently deletes journal content locally and in the cloud when signed in."
        >
          <GroupedRow
            symbol={{ name: 'share-outline', wellColor: s.blue }}
            label="Export My Data"
            onPress={handleExportData}
            accessibilityLabel="Export my data"
            accessibilityHint="Creates a JSON backup you can save or share"
            isFirst
          />
          <GroupedRow
            symbol={{ name: 'download-outline', wellColor: s.teal }}
            label="Import Data"
            onPress={handleImportData}
            accessibilityLabel="Import data"
            accessibilityHint="Restores mood and extension data from a Kairo export file"
          />
          <GroupedRow
            symbol={{ name: 'trash-outline', wellColor: s.red }}
            label="Clear All Data"
            onPress={handleClearData}
            accessibilityLabel="Clear all data"
            accessibilityHint="Permanently deletes mood entries, habits, goals, and reminders on this device"
            showChevron={false}
            destructive
            isLast
          />
        </GroupedSection>
      </ScrollView>
    </SafeAreaView>
  );
}
