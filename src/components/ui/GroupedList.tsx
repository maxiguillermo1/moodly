/**
 * @fileoverview iOS Settings-style grouped list components
 * @module components/ui/GroupedList
 */

import React, { ReactNode, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { spacing, borderRadius, typography, useAppTheme } from '../../theme';
import { Touchable } from '../../ui/Touchable';

const SYMBOL_WELL_SIZE = 29;
const SYMBOL_WELL_RADIUS = 7;
const SYMBOL_ICON_SIZE = 18;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export type GroupedRowSymbol = {
  name: IoniconName;
  wellColor: string;
  iconColor?: string;
};

function useGroupedStyles() {
  const { system: s } = useAppTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        section: {
          marginBottom: spacing[6],
        },
        sectionHeader: {
          ...typography.footnote,
          fontWeight: '600',
          color: s.secondaryLabel,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          paddingHorizontal: spacing[4],
          paddingBottom: spacing[2],
        },
        sectionContent: {
          backgroundColor: s.secondaryBackground,
          borderRadius: borderRadius.lg,
          marginHorizontal: spacing[4],
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: s.separator,
        },
        sectionFooter: {
          ...typography.footnote,
          color: s.secondaryLabel,
          paddingHorizontal: spacing[4],
          paddingTop: spacing[2],
          lineHeight: 18,
        },
        symbolWell: {
          width: SYMBOL_WELL_SIZE,
          height: SYMBOL_WELL_SIZE,
          borderRadius: SYMBOL_WELL_RADIUS,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing[3],
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[4],
          backgroundColor: s.secondaryBackground,
          minHeight: 44,
        },
        rowPressed: {
          backgroundColor: s.fill,
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
          backgroundColor: s.separator,
        },
        rowIcon: {
          fontSize: 22,
          marginRight: spacing[3],
        },
        rowLabel: {
          ...typography.body,
          color: s.label,
          flex: 1,
        },
        rowLabelDestructive: {
          color: s.red,
        },
        rowRight: {
          flexDirection: 'row',
          alignItems: 'center',
          flexShrink: 0,
        },
        rowValue: {
          ...typography.body,
          color: s.secondaryLabel,
          marginRight: spacing[2],
          fontVariant: ['tabular-nums'],
        },
        chevronIcon: {
          marginRight: -1,
        },
      }),
    [s]
  );
}

interface GroupedSectionProps {
  header?: string;
  footer?: string;
  children: ReactNode;
}

export function GroupedSection({ header, footer, children }: GroupedSectionProps) {
  const styles = useGroupedStyles();
  return (
    <View style={styles.section} accessibilityRole="none">
      {header && (
        <Text style={styles.sectionHeader} allowFontScaling maxFontSizeMultiplier={1.3}>
          {header}
        </Text>
      )}
      <View style={styles.sectionContent}>{children}</View>
      {footer && (
        <Text style={styles.sectionFooter} allowFontScaling maxFontSizeMultiplier={1.35}>
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
  symbol?: GroupedRowSymbol;
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
  symbol,
  onPress,
  showChevron = true,
  isFirst = false,
  isLast = false,
  destructive = false,
  right,
}: GroupedRowProps) {
  const styles = useGroupedStyles();
  const { system } = useAppTheme();
  const hasSymbol = !!symbol;
  const hasEmoji = !!icon && !hasSymbol;

  const separatorInsetLeft =
    spacing[4] +
    (hasSymbol ? SYMBOL_WELL_SIZE + spacing[3] : hasEmoji ? 22 + spacing[3] : 0);

  const leading = hasSymbol ? (
    <View
      style={[
        styles.symbolWell,
        {
          backgroundColor: symbol!.wellColor,
        },
      ]}
    >
      <Ionicons name={symbol!.name} size={SYMBOL_ICON_SIZE} color={symbol!.iconColor ?? '#FFFFFF'} />
    </View>
  ) : hasEmoji ? (
    <Text style={styles.rowIcon} allowFontScaling={false}>
      {icon}
    </Text>
  ) : null;

  const content = (
    <View style={[styles.row, isFirst && styles.rowFirst, isLast && styles.rowLast]}>
      {leading}
      <Text
        style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}
        allowFontScaling
        maxFontSizeMultiplier={1.34}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={styles.rowRight}>
        {right ?? (
          <>
            {value ? (
              <Text
                style={styles.rowValue}
                allowFontScaling
                numberOfLines={1}
                maxFontSizeMultiplier={1.35}
              >
                {value}
              </Text>
            ) : null}
            {onPress && showChevron ? (
              <Ionicons
                name="chevron-forward"
                size={14}
                color={system.tertiaryLabel}
                style={styles.chevronIcon}
              />
            ) : null}
          </>
        )}
      </View>

      {!isLast ? (
        <View pointerEvents="none" style={[styles.separator, { left: separatorInsetLeft }]} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Touchable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => (pressed ? styles.rowPressed : undefined)}
      >
        {content}
      </Touchable>
    );
  }

  return content;
}
