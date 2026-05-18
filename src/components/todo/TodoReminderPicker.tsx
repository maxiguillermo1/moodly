/**
 * @fileoverview Modal sheet: pick a time-of-day reminder for a task (presets + clear).
 * @module components/todo/TodoReminderPicker
 */

import React, { useEffect, useMemo } from 'react';
import {
  AccessibilityInfo,
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { borderRadius, spacing, typography, useAppTheme } from '../../theme';
import { Touchable } from '../../ui/Touchable';
import { haptics } from '../../system/haptics';
import { formatReminderMinutes, REMINDER_QUICK_MINUTES } from '../../utils';

export type TodoReminderPickerProps = {
  visible: boolean;
  onRequestClose: () => void;
  /** Current reminder on the row, or null. */
  selectedMinutes: number | null;
  onSelect: (minutes: number | null) => void;
};

export const TodoReminderPicker = React.memo(function TodoReminderPicker({
  visible,
  onRequestClose,
  selectedMinutes,
  onSelect,
}: TodoReminderPickerProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { system: s, a11y } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        veil: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          justifyContent: 'flex-end',
        },
        sheet: {
          backgroundColor: s.secondaryBackground,
          borderTopLeftRadius: borderRadius.xl,
          borderTopRightRadius: borderRadius.xl,
          paddingBottom: Math.max(insets.bottom, spacing[4]),
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: s.separator,
          maxHeight: '88%',
        },
        grab: {
          alignSelf: 'center',
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: s.tertiaryLabel,
          opacity: 0.35,
          marginTop: spacing[3],
          marginBottom: spacing[2],
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: s.separator,
        },
        headerTitle: {
          ...typography.headline,
          color: s.label,
          fontWeight: '600',
        },
        list: {
          paddingVertical: spacing[2],
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing[4],
          paddingHorizontal: spacing[4],
          minHeight: 48,
        },
        rowLabel: {
          ...typography.body,
          color: s.label,
          flex: 1,
        },
        rowMuted: {
          color: s.secondaryLabel,
        },
        check: {
          marginLeft: spacing[2],
        },
      }),
    [s, insets.bottom]
  );

  const pick = (m: number | null) => {
    haptics.select();
    onSelect(m);
    onRequestClose();
  };

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility('Remind me');
    }, 250);
    return () => clearTimeout(id);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType={a11y.reduceMotion ? 'none' : 'slide'}
      transparent
      onRequestClose={onRequestClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.veil}>
        <Touchable
          style={{ flex: 1 }}
          onPress={() => {
            haptics.select();
            onRequestClose();
          }}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={{ flex: 1 }} />
        </Touchable>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.grab} accessible={false} accessibilityElementsHidden importantForAccessibility="no" />
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle} maxFontSizeMultiplier={1.28} accessibilityRole="header">
              Remind me
            </Text>
            <Touchable
              onPress={() => {
                haptics.select();
                onRequestClose();
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              accessibilityHint="Closes reminder time picker"
            >
              <Ionicons
                name="close"
                size={26}
                color={s.secondaryLabel}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </Touchable>
          </View>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" bounces={false}>
            <Touchable
              onPress={() => pick(null)}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel="No reminder time"
              accessibilityState={{ selected: selectedMinutes == null }}
            >
              <Text style={[styles.rowLabel, selectedMinutes == null ? null : styles.rowMuted]} maxFontSizeMultiplier={1.32}>
                No time
              </Text>
              {selectedMinutes == null ? (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={s.blue}
                  style={styles.check}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              ) : null}
            </Touchable>

            {REMINDER_QUICK_MINUTES.map((m) => {
              const label = formatReminderMinutes(m);
              const sel = selectedMinutes === m;
              return (
                <Touchable
                  key={m}
                  onPress={() => pick(m)}
                  style={styles.row}
                  accessibilityRole="button"
                  accessibilityLabel={`Remind at ${label}`}
                  accessibilityState={{ selected: sel }}
                >
                  <Text style={[styles.rowLabel, sel ? null : styles.rowMuted]} maxFontSizeMultiplier={1.32}>
                    {label}
                  </Text>
                  {sel ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={s.blue}
                      style={styles.check}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                  ) : null}
                </Touchable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});
