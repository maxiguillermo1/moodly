/**
 * @fileoverview Badge component for mood grades
 * @module components/ui/Badge
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MoodGrade } from '../../types';
import { getMoodColor } from '../../lib/constants/moods';
import { colors, borderRadius, typography } from '../../theme';

type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  grade: MoodGrade;
  size?: BadgeSize;
  style?: ViewStyle;
}

const SIZE_CONFIG = {
  sm: { width: 28, height: 22, fontSize: 11 },
  md: { width: 40, height: 32, fontSize: 14 },
  lg: { width: 56, height: 44, fontSize: 18 },
};

export function Badge({ grade, size = 'md', style }: BadgeProps) {
  const config = SIZE_CONFIG[size];
  const backgroundColor = getMoodColor(grade);

  return (
    <View
      style={[
        styles.badge,
        {
          width: config.width,
          height: config.height,
          backgroundColor,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: config.fontSize }]}>
        {grade}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.semantic.text.inverse,
    fontWeight: typography.headingSm.fontWeight,
  },
});
