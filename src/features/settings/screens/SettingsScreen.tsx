/**
 * @fileoverview Settings screen - iOS Settings app style
 * @module features/settings/screens/SettingsScreen
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, Alert, Switch, Platform, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  ScreenHeader,
  GroupedSection,
  GroupedRow,
  HabitsSettingsRow,
  GoalsTodaySettingsRow,
  TodoTodaySettingsRow,
} from '@/components';
import {
  clearAllEntries,
  clearAllHabitSelections,
  resetTrackedHabitsToDefaults,
  getSettings,
  getMoodStats,
  setCalendarMoodStyle,
} from '@/storage';
import { MOOD_GRADES, getMoodLabel } from '@/utils';
import { logger } from '@/security';
import { APP_RELEASE_VERSION } from '@/constants';
import { perfProbe, usePerfScreen } from '@/perf';
import { CalendarMoodStyle, MoodGrade, MoodGradeColorStyle } from '@/types';
import { spacing, useAppTheme } from '@/theme';
import { haptics } from '@/system/haptics';
import { formatMoodA11yLabel } from '@/system/accessibility';

export default function SettingsScreen() {
  usePerfScreen('Settings');
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
  const [calendarMoodStyle, setCalendarMoodStyleState] = useState<CalendarMoodStyle>('dot');

  const loadStatsCountRef = useRef(0);
  const didFlushPerfReportRef = useRef(false);

  const loadStats = useCallback(async () => {
    const phase = loadStatsCountRef.current === 0 ? 'cold' : 'warm';
    loadStatsCountRef.current += 1;
    const p: any = (globalThis as any).performance;
    const start = typeof p?.now === 'function' ? p.now() : Date.now();
    const { totalEntries: total, moodCounts: counts } = await getMoodStats();
    setTotalEntries(total);
    setMoodCounts(counts);
    const end = typeof p?.now === 'function' ? p.now() : Date.now();
    logger.perf('settings.loadStats', {
      phase,
      source: 'sessionCache',
      durationMs: Number(((end as number) - (start as number)).toFixed(1)),
    });
  }, []);

  const loadTheme = useCallback(async () => {
    const p: any = (globalThis as any).performance;
    const start = typeof p?.now === 'function' ? p.now() : Date.now();
    const settings = await getSettings();
    setCalendarMoodStyleState(settings.calendarMoodStyle);
    const end = typeof p?.now === 'function' ? p.now() : Date.now();
    logger.perf('settings.loadTheme', {
      phase: 'warm',
      source: 'sessionCache',
      durationMs: Number(((end as number) - (start as number)).toFixed(1)),
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (perfProbe.enabled) didFlushPerfReportRef.current = false;
      const task = InteractionManager.runAfterInteractions(() => {
        void loadStats();
        void loadTheme();
      });
      return () => {
        task.cancel();
        if (perfProbe.enabled && !didFlushPerfReportRef.current) {
          didFlushPerfReportRef.current = true;
          perfProbe.flushReport('SettingsScreen.blur');
        }
      };
    }, [loadStats, loadTheme])
  );

  function handleClearData() {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your mood entries. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
              try {
                await clearAllEntries();
                await clearAllHabitSelections();
                await resetTrackedHabitsToDefaults();
                loadStats();
              Alert.alert('Done', 'All entries have been deleted.');
            } catch {
              logger.warn('settings.clearAll.failed');
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          },
        },
      ]
    );
  }

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

        <GroupedSection
          header="Theme"
          footer="Calendar rendering: dot shows a small mood indicator under the day. Full color fills the day cell."
        >
          <GroupedRow
            symbol={{ name: 'color-palette-outline', wellColor: s.purple }}
            label="Full color days"
            showChevron={false}
            right={(
              <Switch
                value={calendarMoodStyle === 'fill'}
                onValueChange={async (next) => {
                  haptics.toggle();
                  const style: CalendarMoodStyle = next ? 'fill' : 'dot';
                  setCalendarMoodStyleState(style);
                  try {
                    await setCalendarMoodStyle(style);
                  } catch {
                    logger.warn('settings.setCalendarMoodStyle.failed', { style });
                    Alert.alert('Error', 'Failed to save setting. Please try again.');
                    const fresh = await getSettings().catch(() => null);
                    if (fresh) setCalendarMoodStyleState(fresh.calendarMoodStyle);
                  }
                }}
                trackColor={switchTrack}
                ios_backgroundColor={switchIosBg}
                thumbColor={switchThumb}
                accessibilityLabel="Use full color calendar days"
                accessibilityHint="Switches calendar mood markers between dots and filled day cells"
                accessibilityState={{ checked: calendarMoodStyle === 'fill' }}
              />
            )}
            isFirst
            isLast
          />
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
            value={APP_RELEASE_VERSION}
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

        <GroupedSection header="Data" footer="This action cannot be undone.">
          <GroupedRow
            symbol={{ name: 'trash-outline', wellColor: s.red }}
            label="Clear All Data"
            onPress={handleClearData}
            showChevron={false}
            destructive
            isFirst
            isLast
          />
        </GroupedSection>
      </ScrollView>
    </SafeAreaView>
  );
}
