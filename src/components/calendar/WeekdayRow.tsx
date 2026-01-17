/**
 * @fileoverview Weekday row for calendar grids
 * @module components/calendar/WeekdayRow
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

const WEEKDAYS_MINI = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface WeekdayRowProps {
  variant: 'mini' | 'full';
}

export const WeekdayRow = React.memo(function WeekdayRow({ variant }: WeekdayRowProps) {
  if (variant === 'mini') {
    return (
      <View style={styles.miniRow}>
        {WEEKDAYS_MINI.map((d, idx) => (
          <Text key={`wd-${idx}`} style={styles.miniText}>
            {d}
          </Text>
        ))}
      </View>
    );
  }

  // Full variant shows the iOS-style single letters too (keeps visual parity with CalendarView).
  return (
    <View style={styles.fullRow}>
      {WEEKDAYS_MINI.map((d, idx) => (
        <Text key={`wd-${idx}`} style={styles.fullText}>
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
    color: colors.system.tertiaryLabel,
    width: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  fullRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fullText: {
    fontSize: 12,
    lineHeight: 13,
    color: colors.system.secondaryLabel,
    width: 44,
    textAlign: 'center',
    fontWeight: '600',
  },
});

