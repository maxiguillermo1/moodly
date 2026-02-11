/**
 * @fileoverview Inline mood badge with optional label
 * @module components/mood/MoodBadge
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MoodGrade } from '../../types';
import { getMoodConfig } from '../../utils';
import { colors, spacing, borderRadius } from '../../theme';

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

/**
 * Presentational component used in hot lists (e.g., Journal).
 * Memoized to reduce rerenders when parent lists update.
 */
export const MoodBadge = React.memo(function MoodBadge({
  grade,
  showLabel = false,
  size = 'md',
}: MoodBadgeProps) {
  const config = getMoodConfig(grade);
  const sizeConfig = SIZES[size];

  const badgeStyle = useMemo(
    () => ({
      width: sizeConfig.badge,
      height: sizeConfig.badge,
      backgroundColor: config.color,
    }),
    [config.color, sizeConfig.badge]
  );

  const gradeTextStyle = useMemo(
    () => ({ fontSize: sizeConfig.font }),
    [sizeConfig.font]
  );

  const labelTextStyle = useMemo(
    () => ({ fontSize: sizeConfig.labelFont }),
    [sizeConfig.labelFont]
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          badgeStyle,
        ]}
      >
        <Text style={[styles.grade, gradeTextStyle]} allowFontScaling>
          {grade}
        </Text>
      </View>
      
      {showLabel && (
        <Text style={[styles.label, labelTextStyle]} allowFontScaling>
          {config.label}
        </Text>
      )}
    </View>
  );
});

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
