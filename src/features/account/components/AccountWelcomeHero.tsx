/**
 * @fileoverview Local-first welcome intro for account onboarding.
 * @module features/account/components/AccountWelcomeHero
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { borderRadius, spacing, typography, useAppTheme } from '@/theme';

export function AccountWelcomeHero(): React.ReactElement {
  const { system: s } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginHorizontal: spacing[4],
          marginBottom: spacing[4],
          padding: spacing[4],
          borderRadius: borderRadius.xl,
          backgroundColor: s.secondaryBackground,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: s.separator,
          alignItems: 'center',
        },
        iconWell: {
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: s.blue,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing[3],
        },
        title: {
          ...typography.title3,
          color: s.label,
          textAlign: 'center',
          marginBottom: spacing[2],
        },
        body: {
          ...typography.subhead,
          color: s.secondaryLabel,
          textAlign: 'center',
          lineHeight: 21,
        },
      }),
    [s]
  );

  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.iconWell} accessible={false} importantForAccessibility="no">
        <Ionicons name="color-palette-outline" size={28} color="#FFFFFF" />
      </View>
      <Text style={styles.title} allowFontScaling maxFontSizeMultiplier={1.3}>
        Your mood timeline, on this device
      </Text>
      <Text style={styles.body} allowFontScaling maxFontSizeMultiplier={1.35}>
        Kairo is local-first. Start offline with no account, or sign in later to back up and sync
        across devices. Your journal stays private either way.
      </Text>
    </View>
  );
}
