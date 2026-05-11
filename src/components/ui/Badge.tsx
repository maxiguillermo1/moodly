/**
 * @fileoverview Badge component for mood grades
 * @module components/ui/Badge
 */

import React, { useMemo } from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import { MoodGrade } from '../../types';
import { borderRadius, typography, useAppTheme } from '../../theme';
import { MoodGradeSurface } from '../mood/MoodGradeSurface';

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

export function Badge({ grade, size = 'md', style }: BadgeProps): React.ReactElement {
  const { semantic, moodGradeColorStyle, isDark } = useAppTheme();
  const config = SIZE_CONFIG[size];

  const sizing = useMemo(
    () => ({
      width: config.width,
      height: config.height,
    }),
    [config.height, config.width]
  );

  const textStyle = useMemo(
    () => ({
      fontSize: config.fontSize,
      color: semantic.text.inverse,
      fontWeight: typography.headingSm.fontWeight,
    }),
    [config.fontSize, semantic.text.inverse]
  );

  return (
    <MoodGradeSurface
      grade={grade}
      moodGradeColorStyle={moodGradeColorStyle}
      isDark={isDark}
      variant="opaque"
      style={[styles.badge, sizing, style]}
    >
      <Text style={[styles.textBase, textStyle]} allowFontScaling maxFontSizeMultiplier={1.3}>
        {grade}
      </Text>
    </MoodGradeSurface>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBase: {
    textAlign: 'center',
  },
});
