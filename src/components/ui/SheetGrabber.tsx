/**
 * @fileoverview iOS sheet affordance (horizontal “grabber” pill).
 * @module components/ui/SheetGrabber
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { spacing, useAppTheme } from '../../theme';

export function SheetGrabber(): React.ReactElement {
  const { system } = useAppTheme();
  const grabStyle = useMemo(
    () => [
      styles.grabber,
      {
        backgroundColor: system.gray3,
        marginTop: Platform.OS === 'ios' ? spacing[2] : spacing[1],
      },
    ],
    [system.gray3]
  );
  return <View style={grabStyle} accessible={false} />;
}

const styles = StyleSheet.create({
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 2.5,
    marginBottom: spacing[2],
    opacity: Platform.OS === 'android' ? 0.85 : 1,
  },
});
