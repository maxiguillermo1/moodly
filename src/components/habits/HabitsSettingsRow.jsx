import { jsx as _jsx } from "react/jsx-runtime";
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
export function HabitsSettingsRow({ enabled, onToggle, isFirst = true, isLast = true, }) {
    const navigation = useNavigation();
    const { system: s } = useAppTheme();
    const switchTrack = { false: s.gray5, true: s.green };
    const switchIosBg = s.gray5;
    const switchThumb = Platform.OS === 'android' ? s.secondaryBackground : undefined;
    const handleSwitch = useCallback(async (next) => {
        haptics.toggle();
        try {
            await onToggle(next);
            announceForAccessibility(`Habits on Today ${next ? 'on' : 'off'}`);
        }
        catch {
            logger.warn('settings.setHabitsEnabled.failed', { next });
            Alert.alert('Error', 'Failed to save extensions preference. Please try again.');
        }
    }, [onToggle]);
    const openHabits = useCallback(() => {
        haptics.select();
        // Replace Settings so Habits sits on the root stack; back returns to the tab under Settings.
        navigation.replace('Habits');
    }, [navigation]);
    return (_jsx(GroupedRow, { symbol: { name: 'leaf-outline', wellColor: s.green }, label: "Habits", showChevron: false, onPress: openHabits, accessibilityLabel: "Open Habits", accessibilityHint: "Opens habit settings and daily habit tracking", isFirst: isFirst, isLast: isLast, right: (_jsx(Switch, { value: enabled, onValueChange: (v) => void handleSwitch(v), trackColor: switchTrack, ios_backgroundColor: switchIosBg, thumbColor: switchThumb, accessibilityLabel: "Show Habits on Today", accessibilityState: { checked: enabled } })) }));
}
