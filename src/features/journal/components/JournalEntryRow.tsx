/**
 * @fileoverview Memoized journal list row (FlashList / SectionList / FlatList).
 * @module features/journal/components/JournalEntryRow
 */

import React, { useCallback } from 'react';
import { View, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import type { MoodEntry, MoodGradeColorStyle } from '@/types';
import { getRelativeDayLabel, formatDateForDisplay } from '@/utils';
import { MoodBadge } from '@/components';
import { Touchable } from '@/ui/Touchable';
import { formatMoodA11yLabel } from '@/system/accessibility';

export type JournalEntryRowStyles = {
  row: StyleProp<ViewStyle>;
  rowLeft: StyleProp<ViewStyle>;
  rowTitle: StyleProp<TextStyle>;
  rowSubtitle: StyleProp<TextStyle>;
};

export type JournalEntryRowProps = {
  entry: MoodEntry;
  moodGradeColorStyle: MoodGradeColorStyle;
  isDark: boolean;
  onTap: (e: MoodEntry) => void;
  onLongPress: (e: MoodEntry) => void;
  /** Stable object from the screen’s StyleSheet memo (reference equality when theme is unchanged). */
  rowStyles: JournalEntryRowStyles;
};

function JournalEntryRowInner(props: JournalEntryRowProps): React.ReactElement {
  const { entry, moodGradeColorStyle, isDark, onTap, onLongPress, rowStyles } = props;
  const handlePress = useCallback(() => onTap(entry), [entry, onTap]);
  const handleLong = useCallback(() => onLongPress(entry), [entry, onLongPress]);
  const noteState = entry.note ? 'Has note' : 'No note';
  const a11yLabel = `${formatDateForDisplay(entry.date)} entry. Mood ${formatMoodA11yLabel(entry.mood)}. ${noteState}.`;
  return (
    <Touchable
      style={rowStyles.row}
      onPress={handlePress}
      onLongPress={handleLong}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Opens editor. Long press to delete."
      accessibilityActions={[{ name: 'activate', label: 'Edit' }, { name: 'delete', label: 'Delete' }]}
      onAccessibilityAction={(event: any) => {
        if (event.nativeEvent.actionName === 'delete') handleLong();
        if (event.nativeEvent.actionName === 'activate') handlePress();
      }}
    >
      <View style={rowStyles.rowLeft}>
        <Text style={rowStyles.rowTitle} allowFontScaling maxFontSizeMultiplier={1.3}>
          {getRelativeDayLabel(entry.date)}
        </Text>
        <Text style={rowStyles.rowSubtitle} allowFontScaling numberOfLines={1} maxFontSizeMultiplier={1.34}>
          {entry.note || 'No note'}
        </Text>
      </View>

      <MoodBadge grade={entry.mood} size="sm" moodGradeColorStyle={moodGradeColorStyle} isDark={isDark} />
    </Touchable>
  );
}

function rowPropsEqual(prev: JournalEntryRowProps, next: JournalEntryRowProps): boolean {
  const a = prev.entry;
  const b = next.entry;
  return (
    a.date === b.date &&
    a.updatedAt === b.updatedAt &&
    a.mood === b.mood &&
    a.note === b.note &&
    prev.isDark === next.isDark &&
    prev.moodGradeColorStyle === next.moodGradeColorStyle &&
    prev.onTap === next.onTap &&
    prev.onLongPress === next.onLongPress &&
    prev.rowStyles === next.rowStyles
  );
}

export const JournalEntryRow = React.memo(JournalEntryRowInner, rowPropsEqual);
