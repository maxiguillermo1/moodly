/**
 * @fileoverview Extension stack for a calendar day: Habits chips + optional Goals / To-do rows (Today, Journal, Calendar modals).
 * @module components/todayExtensions/TodayExtensionsPanel
 */

import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { DayExtensionsStack } from '../../extensions/DayExtensionsStack';
import type { TodayExtensionsInsetVariant } from '../../extensions/types';

export type { TodayExtensionsInsetVariant };

export type TodayExtensionsPanelProps = {
  date: string;
  style?: StyleProp<ViewStyle>;
  /**
   * `screen` (default): horizontal inset for the Today tab.
   * `nested`: parent already applies horizontal padding (journal / calendar day editor).
   */
  insetVariant?: TodayExtensionsInsetVariant;
  /** Dismiss enclosing UI (e.g. journal sheet) before opening Goals / To-do full screen. */
  onBeforeDetailNavigate?: () => void;
};

function TodayExtensionsPanelInner({
  date,
  style,
  insetVariant = 'screen',
  onBeforeDetailNavigate,
}: TodayExtensionsPanelProps): React.ReactElement | null {
  return (
    <DayExtensionsStack
      dateKey={date}
      style={style}
      insetVariant={insetVariant}
      onBeforeDetailNavigate={onBeforeDetailNavigate}
    />
  );
}

/** Memoized: parent mood sheet state updates should not rebuild extension subtrees for the same day. */
export const TodayExtensionsPanel = React.memo(TodayExtensionsPanelInner);
