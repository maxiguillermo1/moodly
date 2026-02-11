/**
 * @fileoverview Badge component for mood grades
 * @module components/ui/Badge
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MoodGrade } from '../../types';
import { getMoodColor } from '../../utils';
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

/**
 * Small presentational component used in hot UI paths.
 * Memoized to reduce rerenders when parent lists update.
 */
export const Badge = React.memo(function Badge({ grade, size = 'md', style }: BadgeProps) {
  const config = SIZE_CONFIG[size];
  const backgroundColor = getMoodColor(grade);

  const badgeStyle = useMemo(
    () => ({
      width: config.width,
      height: config.height,
      backgroundColor,
    }),
    [backgroundColor, config.height, config.width]
  );

  const textStyle = useMemo(() => ({ fontSize: config.fontSize }), [config.fontSize]);

  return (
    <View
      style={[
        styles.badge,
        badgeStyle,
        style,
      ]}
    >
      <Text style={[styles.text, textStyle]} allowFontScaling>
        {grade}
      </Text>
    </View>
  );
});

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
