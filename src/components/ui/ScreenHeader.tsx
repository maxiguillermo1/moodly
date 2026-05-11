/**
 * @fileoverview iOS-style screen header with large title and settings gear
 * @module components/ui/ScreenHeader
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, typography, sizing, useAppTheme } from '../../theme';
import { CapsuleButton } from './CapsuleButton';
import { Touchable } from '../../ui/Touchable';

interface ScreenHeaderProps {
  title: string;
  showSettings?: boolean;
  onPressSettings?: () => void;
  /** Today-style circular gear vs calendar/journal glass capsule */
  settingsStyle?: 'capsule' | 'circle';
}

export function ScreenHeader({
  title,
  showSettings = true,
  onPressSettings,
  settingsStyle = 'capsule',
}: ScreenHeaderProps) {
  const navigation = useNavigation<any>();
  const { system, a11y } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          color: system.label,
          fontWeight: a11y.boldText ? '800' : typography.largeTitle.fontWeight,
        },
        settingsCircle: {
          width: sizing.capsuleHeight,
          height: sizing.capsuleHeight,
          borderRadius: sizing.capsuleRadius,
          backgroundColor: system.secondaryBackground,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: system.separator,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [a11y.boldText, system.label, system.secondaryBackground, system.separator]
  );

  const settingsHitSlop = { top: 8, bottom: 8, left: 8, right: 8 };
  const openSettings = () => (onPressSettings ? onPressSettings() : navigation.navigate('Settings'));

  return (
    <View style={styles.container}>
      <Text style={styles.title} allowFontScaling accessibilityRole="header" maxFontSizeMultiplier={1.35}>
        {title}
      </Text>

      {showSettings && settingsStyle === 'circle' ? (
        <Touchable
          onPress={openSettings}
          hitSlop={settingsHitSlop}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          accessibilityHint="Opens settings"
          style={styles.settingsCircle}
        >
          <Ionicons name="settings-outline" size={sizing.settingsIcon} color={system.label} />
        </Touchable>
      ) : null}

      {showSettings && settingsStyle === 'capsule' ? (
        <CapsuleButton
          kind="icon"
          iconName="settings-outline"
          iconColor={system.label}
          onPress={openSettings}
          hitSlop={settingsHitSlop}
          accessibilityLabel="Settings"
          accessibilityHint="Opens settings"
        />
      ) : null}
    </View>
  );
}
