/**
 * @fileoverview iOS Settings-style grouped list components
 * @module components/ui/GroupedList
 */

import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface GroupedSectionProps {
  header?: string;
  footer?: string;
  children: ReactNode;
}

export function GroupedSection({ header, footer, children }: GroupedSectionProps) {
  return (
    <View style={styles.section}>
      {header && <Text style={styles.sectionHeader}>{header}</Text>}
      <View style={styles.sectionContent}>{children}</View>
      {footer && <Text style={styles.sectionFooter}>{footer}</Text>}
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
  const content = (
    <View
      style={[
        styles.row,
        isFirst && styles.rowFirst,
        isLast && styles.rowLast,
        !isLast && styles.rowBorder,
      ]}
    >
      {icon && <Text style={styles.rowIcon}>{icon}</Text>}
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>
        {label}
      </Text>
      <View style={styles.rowRight}>
        {right ?? (
          <>
            {value && <Text style={styles.rowValue}>{value}</Text>}
            {onPress && showChevron && <Text style={styles.chevron}>›</Text>}
          </>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
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
  rowFirst: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  rowLast: {
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.system.separator,
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
    marginRight: spacing[1],
  },
  chevron: {
    fontSize: 20,
    color: colors.system.tertiaryLabel,
    fontWeight: '600',
  },
});
