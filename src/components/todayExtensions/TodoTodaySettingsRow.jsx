import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Settings row: show To-do starter on Today.
 * @module components/todayExtensions/TodoTodaySettingsRow
 */
import React, { useCallback } from 'react';
import { Switch, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GroupedRow } from '../ui/GroupedList';
import { useAppTheme } from '../../theme';
import { haptics } from '../../system/haptics';
import { logger } from '../../security';
import { announceForAccessibility } from '../../system/accessibility';
export function TodoTodaySettingsRow({ enabled, onToggle, isFirst = false, isLast = false, }) {
    const navigation = useNavigation();
    const { system: s } = useAppTheme();
    const switchTrack = { false: s.gray5, true: s.green };
    const switchIosBg = s.gray5;
    const switchThumb = Platform.OS === 'android' ? s.secondaryBackground : undefined;
    const handleSwitch = useCallback(async (next) => {
        haptics.toggle();
        try {
            await onToggle(next);
            announceForAccessibility(`Reminders on Today ${next ? 'on' : 'off'}`);
        }
        catch {
            logger.warn('settings.setTodayTodoEnabled.failed', { next });
            Alert.alert('Error', 'Failed to save. Please try again.');
        }
    }, [onToggle]);
    const openTodo = useCallback(() => {
        haptics.select();
        navigation.replace('Todo');
    }, [navigation]);
    return (_jsx(GroupedRow, { symbol: { name: 'alarm-outline', wellColor: s.indigo }, label: "Reminders", showChevron: false, onPress: openTodo, accessibilityLabel: "Open Reminders", accessibilityHint: "Opens the reminders screen", isFirst: isFirst, isLast: isLast, right: (_jsx(Switch, { value: enabled, onValueChange: (v) => void handleSwitch(v), trackColor: switchTrack, ios_backgroundColor: switchIosBg, thumbColor: switchThumb, accessibilityLabel: "Show Reminders section on Today", accessibilityState: { checked: enabled } })) }));
}
