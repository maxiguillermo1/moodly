/**
 * @fileoverview Today extension row: open Goals screen (same pattern as Habits from Settings).
 * @module components/todayExtensions/TodayGoalsExtension
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle, InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { borderRadius, spacing, typography, sizing, useAppTheme } from '../../theme';
import { useExtensionsPolicy } from '../../theme/ExtensionsPolicyContext';
import { useDayExtensionsHost } from '../../extensions/DayExtensionsHostContext';
import { Touchable } from '../../ui/Touchable';
import { haptics } from '../../system/haptics';
import { getTodayGoalSummaries, type GoalSummary } from '../../storage';

export type TodayGoalsExtensionProps = {
  /** Local calendar day key passed to Goals when opened from a day editor. */
  date: string;
  containerStyle?: StyleProp<ViewStyle>;
  /** `card` = standalone bordered panel; `stack` = row for {@link TodayExtensionsPanel}. */
  layout?: 'card' | 'stack';
};

export function TodayGoalsExtension({
  date,
  containerStyle,
  layout = 'card',
}: TodayGoalsExtensionProps): React.ReactElement | null {
  const navigation = useNavigation<any>();
  const { todayGoalsEnabled } = useExtensionsPolicy();
  const { onBeforeDetailNavigate } = useDayExtensionsHost();
  const { system: s } = useAppTheme();
  const [goals, setGoals] = useState<GoalSummary[]>([]);
  const stacked = layout === 'stack';

  useEffect(() => {
    let cancelled = false;
    if (!todayGoalsEnabled) return;
    const task = InteractionManager.runAfterInteractions(() => {
      void getTodayGoalSummaries(stacked ? 2 : 3)
        .then((next) => {
          if (!cancelled) setGoals(next);
        })
        .catch(() => {
          if (!cancelled) setGoals([]);
        });
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [stacked, todayGoalsEnabled]);

  const openGoals = useCallback(() => {
    haptics.select();
    onBeforeDetailNavigate?.();
    navigation.navigate('Goals', { date });
  }, [navigation, date, onBeforeDetailNavigate]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: s.secondaryBackground,
          borderRadius: borderRadius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: s.separator,
          paddingVertical: spacing[4],
          paddingHorizontal: spacing[4],
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        iconWell: {
          width: stacked ? 32 : 36,
          height: stacked ? 32 : 36,
          borderRadius: stacked ? 8 : 10,
          backgroundColor: s.orange,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing[3],
        },
        textCol: {
          flex: 1,
          minWidth: 0,
        },
        title: {
          ...(stacked ? typography.subhead : typography.headline),
          fontWeight: stacked ? '600' : typography.headline.fontWeight,
          color: s.label,
          marginBottom: spacing[1],
        },
        body: {
          ...(stacked ? typography.footnote : typography.subhead),
          color: s.secondaryLabel,
          lineHeight: stacked ? 17 : 20,
        },
        previewRow: {
          marginTop: spacing[2],
        },
        previewText: {
          ...typography.caption1,
          color: s.tertiaryLabel,
          lineHeight: 16,
        },
        chevron: {
          marginLeft: spacing[2],
        },
      }),
    [s, stacked]
  );

  if (!todayGoalsEnabled) {
    return null;
  }

  const preview = goals;
  const previewA11y =
    preview.length > 0
      ? `Open Goals. ${preview.length} active preview${preview.length === 1 ? '' : 's'}. ${preview
          .slice(0, 2)
          .map((goal) => `${goal.title}, ${Math.round(goal.percent)} percent`)
          .join('. ')}.`
      : 'Open Goals. Start with one small goal.';
  const inner = (
    <View style={styles.row}>
      <View style={styles.iconWell}>
        <Ionicons
          name="flag-outline"
          size={stacked ? 18 : sizing.iconSm}
          color="#FFFFFF"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title} allowFontScaling maxFontSizeMultiplier={1.28}>
          Goals
        </Text>
        <Text style={styles.body} allowFontScaling maxFontSizeMultiplier={1.34}>
          {preview.length > 0 ? 'Small progress, gently tracked' : 'Start with one small goal'}
        </Text>
        {preview.length > 0 ? (
          <View style={styles.previewRow}>
            {preview.map((goal) => (
              <Text key={goal.id} style={styles.previewText} allowFontScaling maxFontSizeMultiplier={1.24} numberOfLines={1}>
                {goal.completedToday ? '✓' : '○'} {goal.title} {Math.round(goal.percent)}%
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={s.tertiaryLabel}
        style={styles.chevron}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );

  const content = (
    <Touchable
      onPress={openGoals}
      accessibilityRole="button"
      accessibilityLabel={previewA11y}
      accessibilityHint="Opens goals for this day"
    >
      {inner}
    </Touchable>
  );

  if (stacked) {
    return (
      <View style={[{ width: '100%' }, containerStyle]} accessibilityRole="none">
        {content}
      </View>
    );
  }

  return (
    <View style={[{ width: '100%' }, containerStyle]} accessibilityRole="none">
      <View style={styles.card}>{content}</View>
    </View>
  );
}
