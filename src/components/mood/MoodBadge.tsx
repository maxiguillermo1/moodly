/**
 * @fileoverview Inline mood badge with optional label
 * @module components/mood/MoodBadge
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MoodGrade } from '../../types';
import type { MoodGradeColorStyle } from '../../types/settings.types';
import { getMoodConfig } from '../../utils';
import { spacing, borderRadius, useAppTheme } from '../../theme';
import { MoodGradeSurface } from './MoodGradeSurface';

interface MoodBadgeProps {
  grade: MoodGrade;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  moodGradeColorStyle: MoodGradeColorStyle;
  isDark: boolean;
}

const SIZES = {
  sm: { badge: 32, font: 11, labelFont: 9 },
  md: { badge: 44, font: 15, labelFont: 11 },
  lg: { badge: 56, font: 19, labelFont: 13 },
};

export const MoodBadge = React.memo(function MoodBadge({
  grade,
  showLabel = false,
  size = 'md',
  moodGradeColorStyle,
  isDark,
}: MoodBadgeProps) {
  const { semantic } = useAppTheme();
  const config = getMoodConfig(grade);
  const sizeConfig = SIZES[size];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
        },
        badge: {
          borderRadius: borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
        },
        grade: {
          color: semantic.text.inverse,
          fontWeight: '700',
        },
        label: {
          color: semantic.text.secondary,
          marginTop: spacing[1],
        },
      }),
    [semantic.text.inverse, semantic.text.secondary]
  );

  const badgeBox = useMemo(
    () => ({
      width: sizeConfig.badge,
      height: sizeConfig.badge,
    }),
    [sizeConfig.badge]
  );

  const gradeTextStyle = useMemo(() => ({ fontSize: sizeConfig.font }), [sizeConfig.font]);

  const labelTextStyle = useMemo(() => ({ fontSize: sizeConfig.labelFont }), [sizeConfig.labelFont]);

  return (
    <View style={styles.container}>
      <MoodGradeSurface
        grade={grade}
        moodGradeColorStyle={moodGradeColorStyle}
        isDark={isDark}
        variant="opaque"
        style={[styles.badge, badgeBox]}
      >
        <Text style={[styles.grade, gradeTextStyle]} allowFontScaling maxFontSizeMultiplier={1.28}>
          {grade}
        </Text>
      </MoodGradeSurface>

      {showLabel ? (
        <Text style={[styles.label, labelTextStyle]} allowFontScaling maxFontSizeMultiplier={1.34}>
          {config.label}
        </Text>
      ) : null}
    </View>
  );
});
