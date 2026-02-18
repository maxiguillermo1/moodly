/**
 * @fileoverview iOS-style screen header with large title and settings gear
 * @module components/ui/ScreenHeader
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '../../theme';
import { CapsuleButton } from './CapsuleButton';

interface ScreenHeaderProps {
  title: string;
  showSettings?: boolean;
  onPressSettings?: () => void;
}

export function ScreenHeader({ title, showSettings = true, onPressSettings }: ScreenHeaderProps) {
  const navigation = useNavigation<any>();

  // Keep touch targets >= 44pt without changing visual size.
  // (iOS HIG: minimum tappable area)
  const settingsHitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

  return (
    <View style={styles.container}>
      <Text style={styles.title} allowFontScaling>
        {title}
      </Text>
      
      {showSettings && (
        <CapsuleButton
          kind="icon"
          iconName="settings-outline"
          iconColor={colors.system.label}
          onPress={() => (onPressSettings ? onPressSettings() : navigation.navigate('Settings'))}
          hitSlop={settingsHitSlop}
          accessibilityLabel="Settings"
          accessibilityHint="Opens settings"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  title: {
    ...typography.largeTitle,
    color: colors.system.label,
  },
});
