/**
 * @fileoverview iOS-style mood picker
 * @module components/mood/MoodPicker
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MoodGrade } from '../../types';
import { getAllMoodConfigs } from '../../utils';
import { colors, spacing, borderRadius, useAppTheme } from '../../theme';
import { MoodGradeSurface } from './MoodGradeSurface';
import { Touchable } from '../../ui/Touchable';
import { haptics } from '../../system/haptics';
import { announceForAccessibility, formatMoodA11yLabel } from '../../system/accessibility';

interface MoodPickerProps {
  selectedMood: MoodGrade | null;
  onSelect: (mood: MoodGrade) => void;
  title?: string;
  compact?: boolean;
}

export function MoodPicker({
  selectedMood,
  onSelect,
  title = 'How was your day?',
  compact = false,
}: MoodPickerProps) {
  const { system, moodGradeColorStyle, isDark } = useAppTheme();
  const moods = useMemo(() => getAllMoodConfigs(), []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginTop: spacing[0],
          marginBottom: spacing[1],
        },
        title: {
          fontSize: 13,
          lineHeight: 17,
          fontWeight: '600',
          letterSpacing: -0.15,
          color: system.label,
          textAlign: 'center',
          marginBottom: spacing[2],
        },
        grid: {
          alignSelf: 'stretch',
          width: '100%',
        },
        gridRow: {
          flexDirection: 'row',
          alignSelf: 'stretch',
          gap: spacing[1],
        },
        gridRowSpaced: {
          marginTop: spacing[1],
        },
        /** Flex shim so Reanimated Pressable always receives a real column width (avoids clip on small screens). */
        cell: {
          flex: 1,
          minWidth: 0,
        },
        moodButton: {
          width: '100%',
          minHeight: 36,
          paddingVertical: 5,
          paddingHorizontal: spacing[0],
          borderRadius: borderRadius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: system.gray6,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: system.separator,
        },
        grade: {
          fontSize: 13,
          lineHeight: 16,
          fontWeight: '600',
          letterSpacing: -0.2,
          textAlign: 'center',
        },
        segmentedContainer: {
          flexDirection: 'row',
          backgroundColor: system.secondaryFill,
          borderRadius: borderRadius.md,
          padding: 2,
          gap: 2,
        },
        segment: {
          flex: 1,
          height: 30,
          borderRadius: borderRadius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        },
        segmentSelected: {},
        segmentText: {
          fontSize: 12,
          lineHeight: 15,
          fontWeight: '600',
          letterSpacing: -0.08,
        },
        moodButtonSelected: {
          borderWidth: 1.5,
        },
      }),
    [system]
  );

  if (compact) {
    return (
      <View style={styles.segmentedContainer}>
        {moods.map((mood) => {
          const isSelected = selectedMood === mood.grade;
          return (
            <Touchable
              key={mood.grade}
              style={[
                styles.segment,
                isSelected ? styles.segmentSelected : null,
                isSelected && moodGradeColorStyle === 'solid'
                  ? { backgroundColor: colors.moodBackground[mood.grade] }
                  : null,
                isSelected && moodGradeColorStyle === 'gradient' ? { backgroundColor: 'transparent' } : null,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              onPress={() => {
                haptics.select();
                onSelect(mood.grade);
                announceForAccessibility(`Mood ${formatMoodA11yLabel(mood.grade)} selected`);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Mood ${formatMoodA11yLabel(mood.grade)}${isSelected ? ', selected' : ''}`}
              accessibilityHint={isSelected ? 'Currently selected' : 'Selects this mood'}
              accessibilityState={{ selected: isSelected, checked: isSelected }}
            >
              {isSelected && moodGradeColorStyle === 'gradient' ? (
                <MoodGradeSurface
                  grade={mood.grade}
                  moodGradeColorStyle={moodGradeColorStyle}
                  isDark={isDark}
                  variant="surface"
                  style={StyleSheet.absoluteFillObject}
                />
              ) : null}
              <Text
                style={[styles.segmentText, { color: isSelected ? mood.color : system.secondaryLabel, zIndex: 1 }]}
                allowFontScaling
                maxFontSizeMultiplier={1.28}
              >
                {mood.grade}
              </Text>
            </Touchable>
          );
        })}
      </View>
    );
  }

  const renderGradeCell = (mood: (typeof moods)[number]) => {
    const isSelected = selectedMood === mood.grade;
    return (
      <View key={mood.grade} style={styles.cell}>
        <Touchable
          style={[
            styles.moodButton,
            isSelected ? styles.moodButtonSelected : null,
            isSelected && moodGradeColorStyle === 'solid'
              ? { borderColor: mood.color, backgroundColor: colors.moodBackground[mood.grade] }
              : null,
            isSelected && moodGradeColorStyle === 'gradient'
              ? { borderColor: mood.color, backgroundColor: 'transparent' }
              : null,
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
          onPress={() => {
            haptics.select();
            onSelect(mood.grade);
            announceForAccessibility(`Mood ${formatMoodA11yLabel(mood.grade)} selected`);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Mood ${formatMoodA11yLabel(mood.grade)}${isSelected ? ', selected' : ''}`}
          accessibilityHint={isSelected ? 'Currently selected' : 'Selects this mood'}
          accessibilityState={{ selected: isSelected, checked: isSelected }}
        >
          {isSelected && moodGradeColorStyle === 'gradient' ? (
            <MoodGradeSurface
              grade={mood.grade}
              moodGradeColorStyle={moodGradeColorStyle}
              isDark={isDark}
              variant="surface"
              style={StyleSheet.absoluteFillObject}
            />
          ) : null}
          <Text
            style={[styles.grade, { color: mood.color, zIndex: 1 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            allowFontScaling
            maxFontSizeMultiplier={1.25}
          >
            {mood.grade}
          </Text>
        </Touchable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {title ? (
        <Text style={styles.title} allowFontScaling maxFontSizeMultiplier={1.3} accessibilityRole="header">
          {title}
        </Text>
      ) : null}

      <View style={styles.grid}>
        <View style={styles.gridRow}>{moods.slice(0, 3).map(renderGradeCell)}</View>
        <View style={[styles.gridRow, styles.gridRowSpaced]}>{moods.slice(3, 6).map(renderGradeCell)}</View>
      </View>
    </View>
  );
}
