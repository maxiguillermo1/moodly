/**
 * @fileoverview iOS-style screen header with large title and settings gear
 * @module components/ui/ScreenHeader
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, sizing } from '../../theme';

interface ScreenHeaderProps {
  title: string;
  showSettings?: boolean;
  onPressSettings?: () => void;
}

export function ScreenHeader({ title, showSettings = true, onPressSettings }: ScreenHeaderProps) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {showSettings && (
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => (onPressSettings ? onPressSettings() : navigation.navigate('Settings'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="settings-outline"
            size={sizing.settingsIcon}
            color={colors.system.secondaryLabel}
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
  settingsButton: {
    width: sizing.minTouchTarget,
    height: sizing.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
