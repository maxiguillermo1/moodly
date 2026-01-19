/**
 * @fileoverview Settings screen - iOS Settings app style
 * @module screens/SettingsScreen
 */

import React, { useMemo, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenHeader, GroupedSection, GroupedRow } from '../components';
import { getAllEntries, clearAllEntries, getSettings, setCalendarMoodStyle } from '../data';
import { MOOD_GRADES, getMoodLabel } from '../lib/constants/moods';
import { CalendarMoodStyle, MoodGrade } from '../types';
import { colors, spacing } from '../theme';

export default function SettingsScreen() {
  const [totalEntries, setTotalEntries] = useState(0);
  const [moodCounts, setMoodCounts] = useState<Record<MoodGrade, number>>({
    'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0,
  });
  const [calendarMoodStyle, setCalendarMoodStyleState] = useState<CalendarMoodStyle>('dot');

  const loadStats = useCallback(async () => {
    const entries = await getAllEntries();
    setTotalEntries(Object.keys(entries).length);
    // Compute counts from the already-loaded entries (avoids an extra AsyncStorage pass).
    const counts: Record<MoodGrade, number> = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    Object.values(entries).forEach((e) => {
      counts[e.mood]++;
    });
    setMoodCounts(counts);
  }, []);

  const loadTheme = useCallback(async () => {
    const settings = await getSettings();
    setCalendarMoodStyleState(settings.calendarMoodStyle);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadTheme();
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
            await clearAllEntries();
            loadStats();
            Alert.alert('Done', 'All entries have been deleted.');
          },
        },
      ]
    );
  }

  // Calculate top mood (derived)
  const topMood = useMemo(() => {
    if (totalEntries === 0) return null;
    return MOOD_GRADES.reduce((a, b) => (moodCounts[a] > moodCounts[b] ? a : b));
  }, [moodCounts, totalEntries]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Settings" showSettings={false} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <GroupedSection header="Statistics">
          <GroupedRow
            icon="📊"
            label="Total Entries"
            value={String(totalEntries)}
            showChevron={false}
            isFirst
          />
          <GroupedRow
            icon="🏆"
            label="Most Common Mood"
            value={topMood ? `${topMood}` : '—'}
            showChevron={false}
            isLast
          />
        </GroupedSection>

        {/* Theme */}
        <GroupedSection
          header="Theme"
          footer="Calendar rendering: dot shows a small mood indicator under the day. Full color fills the day cell."
        >
          <GroupedRow
            icon="🎨"
            label="Full color days"
            showChevron={false}
            right={(
              <Switch
                value={calendarMoodStyle === 'fill'}
                onValueChange={async (next) => {
                  const style: CalendarMoodStyle = next ? 'fill' : 'dot';
                  setCalendarMoodStyleState(style);
                  await setCalendarMoodStyle(style);
                }}
              />
            )}
            isFirst
            isLast
          />
        </GroupedSection>

        {/* Mood Breakdown */}
        <GroupedSection header="Mood Breakdown">
          {MOOD_GRADES.map((grade, index) => {
            const count = moodCounts[grade];
            const percent = totalEntries > 0
              ? Math.round((count / totalEntries) * 100)
              : 0;

            return (
              <GroupedRow
                key={grade}
                label={`${grade} — ${getMoodLabel(grade)}`}
                value={`${count} (${percent}%)`}
                showChevron={false}
                isFirst={index === 0}
                isLast={index === MOOD_GRADES.length - 1}
              />
            );
          })}
        </GroupedSection>

        {/* App Info */}
        <GroupedSection header="About">
          <GroupedRow
            icon="📱"
            label="Version"
            value="1.0.0"
            showChevron={false}
            isFirst
          />
          <GroupedRow
            icon="💜"
            label="Made with"
            value="React Native + Expo"
            showChevron={false}
            isLast
          />
        </GroupedSection>

        {/* Danger Zone */}
        <GroupedSection header="Data" footer="This action cannot be undone.">
          <GroupedRow
            icon="🗑️"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.system.background,
  },
  scrollContent: {
    paddingTop: spacing[2],
    paddingBottom: 120,
  },
});
