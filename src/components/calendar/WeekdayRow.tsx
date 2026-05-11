/**
 * @fileoverview Weekday row calendar grids — Dynamic Type capped for density.
 * @module components/calendar/WeekdayRow
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme, getCalendarTextLimits } from '../../theme';
import type { FullGridMetrics } from './fullGridLayout';

const WEEKDAYS_MINI = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface WeekdayRowProps {
  variant: 'mini' | 'full';
  /** When set with `variant="full"`, column width and gaps match {@link MonthGrid} (uniform spacing). */
  fullGridLayout?: FullGridMetrics | null;
}

export const WeekdayRow = React.memo(function WeekdayRow({ variant, fullGridLayout }: WeekdayRowProps) {
  const { system, fontScale, windowWidth } = useAppTheme();
  const limits = useMemo(
    () => getCalendarTextLimits(fontScale, windowWidth),
    [fontScale, windowWidth]
  );

  const miniStyle = useMemo(
    () => [styles.miniText, { color: system.tertiaryLabel }],
    [system.tertiaryLabel]
  );
  const fullStyle = useMemo(
    () => [styles.fullText, { color: system.secondaryLabel }],
    [system.secondaryLabel]
  );

  if (variant === 'mini') {
    return (
      <View style={styles.miniRow} accessible={false}>
        {WEEKDAYS_MINI.map((d, idx) => (
          <Text
            key={`wd-${idx}`}
            style={miniStyle}
            allowFontScaling
            maxFontSizeMultiplier={limits.weekdayMini}
          >
            {d}
          </Text>
        ))}
      </View>
    );
  }

  if (fullGridLayout) {
    const { cell, gap } = fullGridLayout;
    return (
      <View
        style={[styles.fullRowUniform, { columnGap: gap, marginBottom: gap }]}
        accessibilityRole="header"
        accessibilityLabel="Weekdays, Sunday through Saturday"
      >
        {WEEKDAYS_MINI.map((d, idx) => (
          <Text
            key={`wd-${idx}`}
            style={[fullStyle, { width: cell }]}
            allowFontScaling
            maxFontSizeMultiplier={limits.weekdayFull}
          >
            {d}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <View
      style={styles.fullRow}
      accessibilityRole="header"
      accessibilityLabel="Weekdays, Sunday through Saturday"
    >
      {WEEKDAYS_MINI.map((d, idx) => (
        <Text
          key={`wd-${idx}`}
          style={fullStyle}
          allowFontScaling
          maxFontSizeMultiplier={limits.weekdayFull}
        >
          {d}
        </Text>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  miniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  miniText: {
    fontSize: 9,
    lineHeight: 10,
    width: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  fullRowUniform: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: '100%',
  },
  fullRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fullText: {
    fontSize: 12,
    lineHeight: 13,
    width: 44,
    textAlign: 'center',
    fontWeight: '600',
  },
});
