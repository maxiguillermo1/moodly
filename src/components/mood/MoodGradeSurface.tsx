/**
 * Renders solid **`mood`** fill or **135° Bloom gradient** (`mood` → `moodGradientMid` @ 70% → **`moodBloomAccent`**) — **`moodGradeColorStyle`**.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { MoodGrade } from '../../types';
import type { MoodGradeColorStyle } from '../../types/settings.types';
import { getMoodColor } from '../../utils';
import {
  getMoodBloomGradientOpaque,
  getMoodBloomGradientSurface,
} from '../../theme/moodGradeBloom';

export type MoodGradeSurfaceVariant = 'opaque' | 'surface';

export const MoodGradeSurface = React.memo(function MoodGradeSurface({
  grade,
  moodGradeColorStyle,
  isDark,
  variant = 'opaque',
  style,
  children,
}: {
  grade: MoodGrade;
  moodGradeColorStyle: MoodGradeColorStyle;
  isDark: boolean;
  variant?: MoodGradeSurfaceVariant;
  style?: object;
  children?: React.ReactNode;
}): React.ReactElement {
  const solid = useMemo(() => ({ backgroundColor: getMoodColor(grade) }), [grade]);

  const grad = useMemo(() => {
    return variant === 'surface'
      ? getMoodBloomGradientSurface(grade, isDark)
      : getMoodBloomGradientOpaque(grade, isDark);
  }, [grade, isDark, variant]);

  const gradientPointerEvents = children ? ('box-none' as const) : ('none' as const);

  if (moodGradeColorStyle === 'solid') {
    return (
      <View style={[styles.clip, style, solid]} pointerEvents="box-none">
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[...grad.colors]}
      locations={[...grad.locations]}
      start={grad.start}
      end={grad.end}
      style={[styles.clip, style]}
      pointerEvents={gradientPointerEvents}
    >
      {children}
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
