/**
 * @fileoverview Settings row: show Goals starter on Today.
 * @module components/todayExtensions/GoalsTodaySettingsRow
 */

import React, { useCallback } from 'react';
import { Switch, Platform, Alert } from 'react-native';

import { useNavigation } from '@react-navigation/native';

import { GroupedRow } from '../ui/GroupedList';
import { useAppTheme } from '../../theme';
import { haptics } from '../../system/haptics';
import { logger } from '../../security';
import { announceForAccessibility } from '../../system/accessibility';

export type GoalsTodaySettingsRowProps = {
  enabled: boolean;
  onToggle: (next: boolean) => Promise<void>;
  isFirst?: boolean;
  isLast?: boolean;
};

export function GoalsTodaySettingsRow({
  enabled,
  onToggle,
  isFirst = false,
  isLast = false,
}: GoalsTodaySettingsRowProps): React.ReactElement {
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
        announceForAccessibility(`Goals on Today ${next ? 'on' : 'off'}`);
      } catch {
        logger.warn('settings.setTodayGoalsEnabled.failed', { next });
        Alert.alert('Error', 'Failed to save. Please try again.');
      }
    },
    [onToggle]
  );

  const openGoals = useCallback(() => {
    haptics.select();
    navigation.replace('Goals');
  }, [navigation]);

  return (
    <GroupedRow
      symbol={{ name: 'flag-outline', wellColor: s.orange }}
      label="Goals"
      showChevron={false}
      onPress={openGoals}
      accessibilityLabel="Open Goals"
      accessibilityHint="Opens Goals screen"
      isFirst={isFirst}
      isLast={isLast}
      right={(
        <Switch
          value={enabled}
          onValueChange={(v) => void handleSwitch(v)}
          trackColor={switchTrack}
          ios_backgroundColor={switchIosBg}
          thumbColor={switchThumb}
          accessibilityLabel="Show Goals on Today"
          accessibilityState={{ checked: enabled }}
        />
      )}
    />
  );
}
