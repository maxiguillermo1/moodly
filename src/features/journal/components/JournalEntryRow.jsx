import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * @fileoverview Memoized journal list row (FlashList / SectionList / FlatList).
 * @module features/journal/components/JournalEntryRow
 */
import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import { getRelativeDayLabel, formatDateForDisplay } from '@/utils';
import { MoodBadge } from '@/components';
import { Touchable } from '@/ui/Touchable';
import { formatMoodA11yLabel } from '@/system/accessibility';
function JournalEntryRowInner(props) {
    const { entry, moodGradeColorStyle, isDark, onTap, onLongPress, rowStyles } = props;
    const handlePress = useCallback(() => onTap(entry), [entry, onTap]);
    const handleLong = useCallback(() => onLongPress(entry), [entry, onLongPress]);
    const noteState = entry.note ? 'Has note' : 'No note';
    const a11yLabel = `${formatDateForDisplay(entry.date)} entry. Mood ${formatMoodA11yLabel(entry.mood)}. ${noteState}.`;
    return (_jsxs(Touchable, { style: rowStyles.row, onPress: handlePress, onLongPress: handleLong, accessibilityRole: "button", accessibilityLabel: a11yLabel, accessibilityHint: "Opens editor. Long press to delete.", accessibilityActions: [{ name: 'activate', label: 'Edit' }, { name: 'delete', label: 'Delete' }], onAccessibilityAction: (event) => {
            if (event.nativeEvent.actionName === 'delete')
                handleLong();
            if (event.nativeEvent.actionName === 'activate')
                handlePress();
        }, children: [_jsxs(View, { style: rowStyles.rowLeft, children: [_jsx(Text, { style: rowStyles.rowTitle, allowFontScaling: true, maxFontSizeMultiplier: 1.3, children: getRelativeDayLabel(entry.date) }), _jsx(Text, { style: rowStyles.rowSubtitle, allowFontScaling: true, numberOfLines: 1, maxFontSizeMultiplier: 1.34, children: entry.note || 'No note' })] }), _jsx(MoodBadge, { grade: entry.mood, size: "sm", moodGradeColorStyle: moodGradeColorStyle, isDark: isDark })] }));
}
function rowPropsEqual(prev, next) {
    const a = prev.entry;
    const b = next.entry;
    return (a.date === b.date &&
        a.updatedAt === b.updatedAt &&
        a.mood === b.mood &&
        a.note === b.note &&
        prev.isDark === next.isDark &&
        prev.moodGradeColorStyle === next.moodGradeColorStyle &&
        prev.onTap === next.onTap &&
        prev.onLongPress === next.onLongPress &&
        prev.rowStyles === next.rowStyles);
}
export const JournalEntryRow = React.memo(JournalEntryRowInner, rowPropsEqual);
