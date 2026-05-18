/**
 * @fileoverview Renders enabled day extensions for one calendar date (registry-driven).
 * @module extensions/DayExtensionsStack
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useExtensionsPolicy } from '../theme/ExtensionsPolicyContext';

import { DayExtensionsHostProvider } from './DayExtensionsHostContext';
import { DayScopeProvider } from './DayScopeContext';
import { orderedActiveExtensionPlugins } from './dayExtensionRegistry';
import type { TodayExtensionsInsetVariant } from './types';

export type DayExtensionsStackProps = {
  dateKey: string;
  insetVariant?: TodayExtensionsInsetVariant;
  style?: StyleProp<ViewStyle>;
  /** e.g. dismiss journal/calendar sheet before pushing Goals or To-do */
  onBeforeDetailNavigate?: () => void;
};

function DayExtensionsStackInner({
  dateKey,
  insetVariant = 'screen',
  style,
  onBeforeDetailNavigate,
}: DayExtensionsStackProps): React.ReactElement | null {
  const policy = useExtensionsPolicy();
  const plugins = useMemo(() => orderedActiveExtensionPlugins(policy), [policy]);

  const host = useMemo(
    () => ({ onBeforeDetailNavigate }),
    [onBeforeDetailNavigate]
  );

  const panelStyle = useMemo(
    () =>
      StyleSheet.create({
        panel: {
          width: '100%',
          backgroundColor: 'transparent',
          borderWidth: 0,
          overflow: 'visible',
        },
      }).panel,
    []
  );

  if (plugins.length === 0) {
    return null;
  }

  return (
    <DayExtensionsHostProvider value={host}>
      <DayScopeProvider dateKey={dateKey}>
        <View style={style} accessibilityRole="none">
          <View style={panelStyle}>
            {plugins.map((plugin) => {
              const Slot = plugin.Slot;
              return (
                <React.Fragment key={plugin.id}>
                  <Slot insetVariant={insetVariant} />
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </DayScopeProvider>
    </DayExtensionsHostProvider>
  );
}

/** Memoized: avoids re-running registry resolution when an ancestor re-renders with the same `dateKey`. */
export const DayExtensionsStack = React.memo(DayExtensionsStackInner);
