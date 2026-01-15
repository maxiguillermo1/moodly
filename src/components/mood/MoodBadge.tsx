/**
 * @fileoverview Inline mood badge with optional label
 * @module components/mood/MoodBadge
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MoodGrade } from '../../types';
import { getMoodConfig } from '../../lib/constants/moods';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface MoodBadgeProps {
  grade: MoodGrade;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { badge: 32, font: 12, labelFont: 10 },
  md: { badge: 44, font: 16, labelFont: 12 },
  lg: { badge: 56, font: 20, labelFont: 14 },
};

export function MoodBadge({ grade, showLabel = false, size = 'md' }: MoodBadgeProps) {
  const config = getMoodConfig(grade);
  const sizeConfig = SIZES[size];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          {
            width: sizeConfig.badge,
            height: sizeConfig.badge,
            backgroundColor: config.color,
          },
        ]}
      >
        <Text style={[styles.grade, { fontSize: sizeConfig.font }]}>
          {grade}
        </Text>
      </View>
      
      {showLabel && (
        <Text style={[styles.label, { fontSize: sizeConfig.labelFont }]}>
          {config.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  badge: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grade: {
    color: colors.semantic.text.inverse,
    fontWeight: '700',
  },
  label: {
    color: colors.semantic.text.secondary,
    marginTop: spacing[1],
  },
});
