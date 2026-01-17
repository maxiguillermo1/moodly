/**
 * @fileoverview iOS-style mood picker
 * @module components/mood/MoodPicker
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MoodGrade } from '../../types';
import { getAllMoodConfigs } from '../../lib/constants/moods';
import { colors, spacing, borderRadius, typography } from '../../theme';

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
  // Stable list (small), avoids recreating arrays on every render.
  const moods = useMemo(() => getAllMoodConfigs(), []);

  if (compact) {
    // Minimal segmented-control style.
    return (
      <View style={styles.segmentedContainer}>
        {moods.map((mood) => {
          const isSelected = selectedMood === mood.grade;
          return (
            <TouchableOpacity
              key={mood.grade}
              style={[
                styles.segment,
                isSelected ? styles.segmentSelected : null,
                isSelected ? { backgroundColor: colors.moodBackground[mood.grade] } : null,
              ]}
              onPress={() => onSelect(mood.grade)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: isSelected ? mood.color : colors.system.secondaryLabel },
                ]}
              >
                {mood.grade}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={styles.grid}>
        {moods.map((mood) => {
          const isSelected = selectedMood === mood.grade;
          
          return (
            <TouchableOpacity
              key={mood.grade}
              style={[
                styles.moodButton,
                isSelected ? styles.moodButtonSelected : null,
                isSelected ? { borderColor: mood.color, backgroundColor: colors.moodBackground[mood.grade] } : null,
              ]}
              onPress={() => onSelect(mood.grade)}
              activeOpacity={0.7}
            >
              <Text style={[styles.grade, { color: mood.color }]}>{mood.grade}</Text>
              <Text style={styles.label}>{mood.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[4],
  },
  title: {
    ...typography.title3,
    color: colors.system.label,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
  },
  moodButton: {
    width: 100,
    height: 72,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.system.secondaryBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.system.separator,
  },
  grade: {
    ...typography.headline,
  },
  label: {
    ...typography.caption2,
    color: colors.system.secondaryLabel,
    marginTop: 3,
  },

  // Segmented control (compact)
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.system.secondaryFill,
    borderRadius: borderRadius.lg,
    padding: 2,
    gap: 2,
  },
  segment: {
    flex: 1,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    // Keep a stable style identity; the bgColor is still grade-specific.
  },
  segmentText: {
    ...typography.subhead,
    fontWeight: '600',
  },
  moodButtonSelected: {
    // Keep a stable style identity; color/bg are still grade-specific.
  },
});
