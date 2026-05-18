/**
 * @fileoverview Settings row: Habits toggle + tap row to open Habits screen.
 * @module components/habits/HabitsSettingsRow
 */

import React, { useCallback } from 'react';
import { Switch, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { GroupedRow } from '../ui/GroupedList';
import { useAppTheme } from '../../theme';
import { haptics } from '../../system/haptics';
import { logger } from '../../security';
import { announceForAccessibility } from '../../system/accessibility';

export type HabitsSettingsRowProps = {
  enabled: boolean;
  onToggle: (next: boolean) => Promise<void>;
  isFirst?: boolean;
  isLast?: boolean;
};

export function HabitsSettingsRow({
  enabled,
  onToggle,
  isFirst = true,
  isLast = true,
}: HabitsSettingsRowProps): React.ReactElement {
  const navigation = useNavigation<any>();
  const { system: s } = useAppTheme();
  const switchTrack = { false: s.gray5, true: s.green } as const;
  const switchIosBg = s.gray5;
  const switchThumb = Platform.OS === 'android' ? s.secondaryBackground : undefined;

  const handleSwitch = useCallback(
    async (next: boolean) => {
      haptics.toggle();
      try {
        await onToggle(next);
        announceForAccessibility(`Habits on Today ${next ? 'on' : 'off'}`);
      } catch {
        logger.warn('settings.setHabitsEnabled.failed', { next });
        Alert.alert('Error', 'Failed to save extensions preference. Please try again.');
      }
    },
    [onToggle]
  );

  const openHabits = useCallback(() => {
    haptics.select();
    // Replace Settings so Habits sits on the root stack; back returns to the tab under Settings.
    navigation.replace('Habits');
  }, [navigation]);

  return (
    <GroupedRow
      symbol={{ name: 'leaf-outline', wellColor: s.green }}
      label="Habits"
      showChevron={false}
      onPress={openHabits}
      accessibilityLabel="Open Habits"
      accessibilityHint="Opens habit settings and daily habit tracking"
      isFirst={isFirst}
      isLast={isLast}
      right={(
        <Switch
          value={enabled}
          onValueChange={(v) => void handleSwitch(v)}
          trackColor={switchTrack}
          ios_backgroundColor={switchIosBg}
          thumbColor={switchThumb}
          accessibilityLabel="Show Habits on Today"
          accessibilityState={{ checked: enabled }}
        />
      )}
    />
  );
}
