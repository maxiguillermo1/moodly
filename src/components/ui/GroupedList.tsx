/**
 * @fileoverview iOS Settings-style grouped list components
 * @module components/ui/GroupedList
 */

import React, { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface GroupedSectionProps {
  header?: string;
  footer?: string;
  children: ReactNode;
}

export function GroupedSection({ header, footer, children }: GroupedSectionProps) {
  return (
    <View style={styles.section}>
      {header && (
        <Text style={styles.sectionHeader} allowFontScaling>
          {header}
        </Text>
      )}
      <View style={styles.sectionContent}>{children}</View>
      {footer && (
        <Text style={styles.sectionFooter} allowFontScaling>
          {footer}
        </Text>
      )}
    </View>
  );
}

interface GroupedRowProps {
  label: string;
  value?: string;
  icon?: string;
  onPress?: () => void;
  showChevron?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  destructive?: boolean;
  right?: ReactNode;
}

export function GroupedRow({
  label,
  value,
  icon,
  onPress,
  showChevron = true,
  isFirst = false,
  isLast = false,
  destructive = false,
  right,
}: GroupedRowProps) {
  // Match iOS Settings: separators are inset so they align with label text.
  // Emoji icons are used here; treat them as a fixed “slot” to keep rhythm consistent.
  const separatorInsetLeft = spacing[4] + (icon ? 22 + spacing[3] : 0);

  const content = (
    <View style={[styles.row, isFirst && styles.rowFirst, isLast && styles.rowLast]}>
      {icon && (
        <Text style={styles.rowIcon} allowFontScaling={false}>
          {icon}
        </Text>
      )}
      <Text
        style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}
        allowFontScaling
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={styles.rowRight}>
        {right ?? (
          <>
            {value ? (
              <Text style={styles.rowValue} allowFontScaling numberOfLines={1}>
                {value}
              </Text>
            ) : null}
            {onPress && showChevron ? (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.system.tertiaryLabel}
                style={styles.chevronIcon}
              />
            ) : null}
          </>
        )}
      </View>

      {/* Inset separator (iOS grouped list style) */}
      {!isLast ? (
        <View
          pointerEvents="none"
          style={[styles.separator, { left: separatorInsetLeft }]}
        />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => (pressed ? styles.rowPressed : undefined)}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    ...typography.footnote,
    color: colors.system.secondaryLabel,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  sectionContent: {
    backgroundColor: colors.system.secondaryBackground,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing[4],
    overflow: 'hidden',
    // Subtle iOS grouped card stroke.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.system.separator,
  },
  sectionFooter: {
    ...typography.footnote,
    color: colors.system.secondaryLabel,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.system.secondaryBackground,
    minHeight: 44,
  },
  rowPressed: {
    // iOS row highlight (subtle).
    backgroundColor: colors.system.fill,
  },
  rowFirst: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  rowLast: {
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  separator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.system.separator,
  },
  rowIcon: {
    fontSize: 22,
    marginRight: spacing[3],
  },
  rowLabel: {
    ...typography.body,
    color: colors.system.label,
    flex: 1,
  },
  rowLabelDestructive: {
    color: colors.system.red,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    ...typography.body,
    color: colors.system.secondaryLabel,
    marginRight: spacing[2],
  },
  chevronIcon: {
    marginRight: -2, // optical alignment like iOS
  },
});
