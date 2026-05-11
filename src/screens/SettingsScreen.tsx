/**
 * @fileoverview Settings screen - iOS Settings app style
 * @module screens/SettingsScreen
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { ScrollView, StyleSheet, Alert, Switch, Platform, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenHeader, GroupedSection, GroupedRow, LiquidGlass } from '../components';
import {
  clearAllEntries,
  getSettings,
  getMoodStats,
  setCalendarMoodStyle,
} from '../storage';
import { MOOD_GRADES, getMoodLabel } from '../utils';
import { logger } from '../security';
import { APP_RELEASE_VERSION } from '../constants';
import { usePerfScreen } from '../perf';
import { AppearancePreference, CalendarMoodStyle, MoodGrade, MoodGradeColorStyle } from '../types';
import { spacing, borderRadius, typography, useAppTheme } from '../theme';
import { Touchable } from '../ui/Touchable';
import { haptics } from '../system/haptics';

const APPEARANCE_MODES: readonly { mode: AppearancePreference; label: string }[] = [
  { mode: 'system', label: 'Auto' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
];

const MOOD_STYLE_SEGMENTS: readonly { mode: MoodGradeColorStyle; label: string }[] = [
  { mode: 'solid', label: 'Solid' },
  { mode: 'gradient', label: 'Gradient' },
];

export default function SettingsScreen() {
  usePerfScreen('Settings');
  const { system: s, appearancePreference, setAppearancePreference, isDark, a11y, moodGradeColorStyle, setMoodGradeColorStyle } =
    useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: s.background,
        },
        scrollContent: {
          paddingTop: spacing[2],
          paddingBottom: 120,
        },
      }),
    [s.background]
  );

  const appearanceLiquidIntensity = useMemo(() => {
    if (a11y.reduceTransparency) return 0;
    /** Slightly softer than the bottom tab capsule so hierarchy stays clear */
    return Platform.OS === 'android'
      ? 42
      : isDark
        ? 48
        : 56;
  }, [a11y.reduceTransparency, isDark]);

  const appearanceStyles = useMemo(
    () =>
      StyleSheet.create({
        appearanceWrap: {
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[2],
        },
        appearanceGlassCapsule: {
          width: '100%',
        },
        appearanceSegmentsRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing[2],
          paddingVertical: 2,
          minHeight: 34,
        },
        appearanceSegment: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 6,
          paddingHorizontal: spacing[1],
          borderRadius: borderRadius.full,
        },
        appearanceSegmentSelected: {
          backgroundColor: s.tertiaryFill,
        },
        appearanceSegmentLabel: {
          ...typography.footnote,
          color: s.secondaryLabel,
          fontWeight: '500',
          letterSpacing: 0.2,
        },
        appearanceSegmentLabelSelected: {
          color: s.label,
          fontWeight: '600',
        },
        moodStyleCaption: {
          ...typography.footnote,
          color: s.secondaryLabel,
          textAlign: 'center',
          marginTop: spacing[4],
          marginBottom: spacing[1],
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }),
    [s]
  );

  const [totalEntries, setTotalEntries] = useState(0);
  const [moodCounts, setMoodCounts] = useState<Record<MoodGrade, number>>({
    'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0,
  });
  const [calendarMoodStyle, setCalendarMoodStyleState] = useState<CalendarMoodStyle>('dot');

  const loadStatsCountRef = useRef(0);

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
            try {
              await clearAllEntries();
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

  // Calculate top mood (derived)
  const topMood = useMemo(() => {
    if (totalEntries === 0) return null;
    return MOOD_GRADES.reduce((a, b) => (moodCounts[a] > moodCounts[b] ? a : b));
  }, [moodCounts, totalEntries]);

  const handleAppearance = useCallback(async (mode: AppearancePreference) => {
    if (mode === appearancePreference) return;
    haptics.select();
    try {
      await setAppearancePreference(mode);
    } catch {
      logger.warn('settings.setAppearancePreference.failed', { mode });
      Alert.alert('Error', 'Failed to save appearance. Please try again.');
    }
  }, [appearancePreference, setAppearancePreference]);

  const handleMoodGradeStyle = useCallback(
    async (mode: MoodGradeColorStyle) => {
      if (mode === moodGradeColorStyle) return;
      haptics.select();
      try {
        await setMoodGradeColorStyle(mode);
      } catch {
        logger.warn('settings.setMoodGradeColorStyle.failed', { mode });
        Alert.alert('Error', 'Failed to save preference. Please try again.');
      }
    },
    [moodGradeColorStyle, setMoodGradeColorStyle]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Settings" showSettings={false} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Stats Overview */}
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

        {/* Appearance */}
        <GroupedSection
          header="Appearance"
          footer="Automatic follows your device's Light or Dark mode. Gradient mode uses a 135° bloom per grade (theme colors mood, moodGradientMid, moodBloomAccent ending in soft pink at the corner). Updates apply instantly across calendar highlights, the mood picker, journal badges, and other mood‑tinted surfaces."
        >
          <View style={appearanceStyles.appearanceWrap}>
            <LiquidGlass
              style={appearanceStyles.appearanceGlassCapsule}
              radius={borderRadius.full}
              intensity={appearanceLiquidIntensity}
              shadow
              border
            >
              <View
                style={appearanceStyles.appearanceSegmentsRow}
                accessibilityRole="tablist"
                accessibilityLabel="Appearance mode"
              >
                {APPEARANCE_MODES.map(({ mode, label }) => {
                  const selected = appearancePreference === mode;
                  return (
                    <Touchable
                      key={mode}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      accessibilityHint={selected ? 'Selected' : `Switch to ${label} mode`}
                      accessibilityLabel={`${label} appearance`}
                      onPress={() => void handleAppearance(mode)}
                      style={({ pressed }) => [
                        appearanceStyles.appearanceSegment,
                        selected ? appearanceStyles.appearanceSegmentSelected : null,
                        pressed && !selected ? { opacity: 0.88 } : null,
                      ]}
                    >
                      <Text
                        style={[
                          appearanceStyles.appearanceSegmentLabel,
                          selected ? appearanceStyles.appearanceSegmentLabelSelected : null,
                        ]}
                        allowFontScaling
                        maxFontSizeMultiplier={1.25}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </Touchable>
                  );
                })}
              </View>
            </LiquidGlass>

            <Text style={appearanceStyles.moodStyleCaption}>Mood grade color style</Text>
            <LiquidGlass
              style={appearanceStyles.appearanceGlassCapsule}
              radius={borderRadius.full}
              intensity={appearanceLiquidIntensity}
              shadow
              border
            >
              <View
                style={appearanceStyles.appearanceSegmentsRow}
                accessibilityRole="tablist"
                accessibilityLabel="Mood grade color style"
              >
                {MOOD_STYLE_SEGMENTS.map(({ mode, label }) => {
                  const selected = moodGradeColorStyle === mode;
                  return (
                    <Touchable
                      key={mode}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      accessibilityHint={selected ? 'Selected' : `Use ${label} mood colors`}
                      accessibilityLabel={`${label} mood color style`}
                      onPress={() => void handleMoodGradeStyle(mode)}
                      style={({ pressed }) => [
                        appearanceStyles.appearanceSegment,
                        selected ? appearanceStyles.appearanceSegmentSelected : null,
                        pressed && !selected ? { opacity: 0.88 } : null,
                      ]}
                    >
                      <Text
                        style={[
                          appearanceStyles.appearanceSegmentLabel,
                          selected ? appearanceStyles.appearanceSegmentLabelSelected : null,
                        ]}
                        allowFontScaling
                        maxFontSizeMultiplier={1.25}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </Touchable>
                  );
                })}
              </View>
            </LiquidGlass>
          </View>
        </GroupedSection>

        {/* Theme */}
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
                trackColor={{ false: s.gray5, true: s.green }}
                ios_backgroundColor={s.gray5}
                thumbColor={Platform.OS === 'android' ? s.secondaryBackground : undefined}
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

        {/* Danger Zone */}
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
