/**
 * @fileoverview One line in the per-day Reminders list — time cue, swipe to delete, long-press handle to reorder.
 * @module components/todo/TodoTaskRow
 */

import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type AccessibilityActionEvent,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { DayTodoItem } from '../../types';
import { spacing, typography, useAppTheme } from '../../theme';
import { Touchable } from '../../ui/Touchable';
import { haptics } from '../../system/haptics';
import { formatReminderMinutes, isReminderOverdueOnDay } from '../../utils';

export type TodoTaskRowProps = {
  item: DayTodoItem;
  /** Local calendar day (`YYYY-MM-DD`) for reminder overdue styling. */
  dayKey: string;
  showSeparator: boolean;
  onToggle: (id: string, nextDone: boolean) => void;
  onDelete: (id: string) => void;
  /** When set on an open task, shows a clock control to pick a time-of-day cue. */
  onEditReminder?: (id: string) => void;
  /** When set, shows a reorder handle — long-press to drag (via parent list). */
  drag?: () => void;
  isDragging?: boolean;
};

const ROW_PAD_X = spacing[4];

export const TodoTaskRow = React.memo(function TodoTaskRow({
  item,
  dayKey,
  showSeparator,
  onToggle,
  onDelete,
  onEditReminder,
  drag,
  isDragging,
}: TodoTaskRowProps): React.ReactElement {
  const { system: s } = useAppTheme();
  const swipeRef = useRef<Swipeable>(null);

  const reminderLabel =
    item.reminderMinutes != null ? formatReminderMinutes(item.reminderMinutes) : null;
  const showReminderCtl = Boolean(onEditReminder && !item.done);
  const overdue =
    item.reminderMinutes != null && !item.done && isReminderOverdueOnDay(dayKey, item.reminderMinutes);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: reminderLabel || showReminderCtl ? 58 : 52,
          paddingVertical: spacing[3],
          paddingHorizontal: ROW_PAD_X,
          backgroundColor: s.secondaryBackground,
          opacity: isDragging ? 0.9 : 1,
        },
        sep: {
          position: 'absolute',
          left: ROW_PAD_X + 22 + spacing[3] + (drag ? 30 : 0),
          right: ROW_PAD_X + (showReminderCtl ? 40 : 0),
          bottom: 0,
          height: StyleSheet.hairlineWidth,
          backgroundColor: s.separator,
        },
        dragHandle: {
          paddingRight: spacing[2],
          marginRight: spacing[1],
          justifyContent: 'center',
          minHeight: 44,
          minWidth: 32,
        },
        checkHit: {
          paddingRight: spacing[2],
          marginRight: spacing[1],
        },
        mid: {
          flex: 1,
          minWidth: 0,
          justifyContent: 'center',
        },
        title: {
          ...typography.body,
          color: s.label,
          lineHeight: 22,
        },
        titleDone: {
          color: s.tertiaryLabel,
          textDecorationLine: 'line-through',
        },
        timeLine: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: spacing[1],
        },
        timeIcon: {
          marginRight: spacing[1],
        },
        timeText: {
          ...typography.caption1,
          color: s.tertiaryLabel,
          fontVariant: ['tabular-nums'],
        },
        timeOverdue: {
          color: s.orange,
          fontWeight: '600',
        },
        reminderHit: {
          marginLeft: spacing[2],
          paddingLeft: spacing[2],
          minWidth: 40,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
        },
        rightDelete: {
          width: 72,
          backgroundColor: s.red,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }),
    [drag, isDragging, reminderLabel, showReminderCtl, s]
  );

  const flushDelete = useCallback(() => {
    haptics.select();
    swipeRef.current?.close();
    onDelete(item.id);
  }, [item.id, onDelete]);

  const renderRightActions = useCallback(
    () => (
      <Touchable
        onPress={flushDelete}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.title}`}
        style={styles.rightDelete}
      >
        <Ionicons
          name="trash-outline"
          size={22}
          color="#FFFFFF"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </Touchable>
    ),
    [flushDelete, item.title, styles.rightDelete]
  );

  const onAccessibilityAction = useCallback(
    (e: AccessibilityActionEvent) => {
      if (e.nativeEvent.actionName === 'delete') flushDelete();
    },
    [flushDelete]
  );

  const rowInner = (
    <View style={styles.row}>
      {showSeparator ? <View style={styles.sep} pointerEvents="none" /> : null}
      {drag ? (
        <Pressable
          onLongPress={() => {
            haptics.sheet();
            drag();
          }}
          delayLongPress={200}
          style={styles.dragHandle}
          accessibilityRole="button"
          accessibilityLabel="Reorder task"
          accessibilityHint="Touch and hold, then drag to reorder this task"
        >
          <Ionicons
            name="reorder-two-outline"
            size={22}
            color={s.tertiaryLabel}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
      ) : null}
      <Touchable
        onPress={() => {
          haptics.toggle();
          onToggle(item.id, !item.done);
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.done }}
        accessibilityLabel={item.done ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`}
        accessibilityHint="Toggles completion for this reminder"
        accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
        onAccessibilityAction={onAccessibilityAction}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        style={styles.checkHit}
      >
        <Ionicons
          name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={item.done ? s.green : s.secondaryLabel}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </Touchable>
      <View style={styles.mid}>
        <Text
          style={[styles.title, item.done ? styles.titleDone : null]}
          allowFontScaling
          maxFontSizeMultiplier={1.34}
          numberOfLines={3}
        >
          {item.title}
        </Text>
        {reminderLabel ? (
          <View style={styles.timeLine}>
            <Ionicons
              name="alarm-outline"
              size={14}
              color={overdue ? s.orange : s.tertiaryLabel}
              style={styles.timeIcon}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text
              style={[styles.timeText, overdue ? styles.timeOverdue : null]}
              maxFontSizeMultiplier={1.28}
            >
              {overdue ? 'Due · ' : ''}
              {reminderLabel}
            </Text>
          </View>
        ) : null}
      </View>
      {showReminderCtl ? (
        <Touchable
          onPress={() => {
            haptics.select();
            onEditReminder?.(item.id);
          }}
          style={styles.reminderHit}
          accessibilityRole="button"
          accessibilityLabel={item.reminderMinutes != null ? `Change reminder time for ${item.title}` : `Add reminder time for ${item.title}`}
        >
          <Ionicons
            name={item.reminderMinutes != null ? 'time' : 'time-outline'}
            size={22}
            color={item.reminderMinutes != null ? s.blue : s.tertiaryLabel}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Touchable>
      ) : null}
    </View>
  );

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={renderRightActions}
      enabled={!isDragging}
      overshootRight={false}
    >
      {rowInner}
    </Swipeable>
  );
});
