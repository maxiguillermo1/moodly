/**
 * @fileoverview Card container component
 * @module components/ui/Card
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../theme';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof spacing;
  shadow?: keyof typeof shadows;
}

export function Card({
  children,
  style,
  padding = 4,
  shadow = 'md',
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        { padding: spacing[padding] },
        shadows[shadow],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.semantic.surface,
    borderRadius: borderRadius.xl,
  },
});
