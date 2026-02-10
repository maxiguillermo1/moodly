/**
 * @fileoverview iOS-style screen header with large title and settings gear
 * @module components/ui/ScreenHeader
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, typography, sizing } from '../../theme';
import { LiquidGlass } from './LiquidGlass';

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
        <TouchableOpacity
          style={styles.settingsPill}
          onPress={() => (onPressSettings ? onPressSettings() : navigation.navigate('Settings'))}
          hitSlop={settingsHitSlop}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          accessibilityHint="Opens settings"
        >
          <LiquidGlass
            style={StyleSheet.absoluteFill}
            radius={sizing.capsuleRadius}
            // Small pills: keep shadow very subtle
            shadow={false}
          >
            {null}
          </LiquidGlass>
          <Ionicons
            name="settings-outline"
            size={sizing.iconSm}
            color={colors.system.label}
          />
        </TouchableOpacity>
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
  settingsPill: {
    height: sizing.capsuleHeight,
    minWidth: sizing.capsuleHeight,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: sizing.capsuleRadius,
    overflow: 'hidden',
  },
});
