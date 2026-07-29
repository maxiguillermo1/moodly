/**
 * @fileoverview Gentle prompt to back up the mood timeline via cloud account.
 * @module features/account/components/CloudBackupPromptModal
 */

import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LiquidGlass } from '@/components';
import { borderRadius, spacing, typography, useAppTheme } from '@/theme';
import { haptics } from '@/system/haptics';
import { Touchable } from '@/ui/Touchable';

type CloudBackupPromptModalProps = {
  visible: boolean;
  onBackUp: () => void;
  onNotNow: () => void;
};

export function CloudBackupPromptModal({
  visible,
  onBackUp,
  onNotNow,
}: CloudBackupPromptModalProps): React.ReactElement {
  const { system: s, a11y } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          justifyContent: 'center',
          paddingHorizontal: spacing[4],
        },
        sheetGlass: {
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
        },
        sheet: {
          padding: spacing[4],
          backgroundColor: s.secondaryBackground,
        },
        iconWell: {
          width: 52,
          height: 52,
          borderRadius: 14,
          backgroundColor: s.blue,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
          marginBottom: spacing[3],
        },
        title: {
          ...typography.title3,
          color: s.label,
          textAlign: 'center',
          marginBottom: spacing[2],
        },
        body: {
          ...typography.subhead,
          color: s.secondaryLabel,
          textAlign: 'center',
          lineHeight: 21,
          marginBottom: spacing[4],
        },
        primaryButton: {
          backgroundColor: s.blue,
          borderRadius: borderRadius.lg,
          paddingVertical: spacing[3],
          alignItems: 'center',
          marginBottom: spacing[2],
        },
        primaryLabel: {
          ...typography.body,
          color: '#FFFFFF',
          fontWeight: '600',
        },
        secondaryButton: {
          paddingVertical: spacing[2],
          alignItems: 'center',
        },
        secondaryLabel: {
          ...typography.body,
          color: s.blue,
        },
      }),
    [s]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={a11y.reduceMotion ? 'none' : 'fade'}
      onRequestClose={onNotNow}
    >
      <View style={styles.backdrop}>
        <LiquidGlass style={styles.sheetGlass} radius={borderRadius.xl} intensity={72} prominent>
          <View style={styles.sheet} accessibilityViewIsModal accessibilityRole="alert">
            <View style={styles.iconWell} accessible={false} importantForAccessibility="no">
              <Ionicons name="cloud-upload-outline" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.title} allowFontScaling maxFontSizeMultiplier={1.3}>
              Back up your timeline?
            </Text>
            <Text style={styles.body} allowFontScaling maxFontSizeMultiplier={1.35}>
              You have mood entries on this device. Sign in to keep your colored timeline safe across
              reinstalls and new phones — optional, and always private.
            </Text>
            <Touchable
              style={styles.primaryButton}
              onPress={() => {
                haptics.select();
                onBackUp();
              }}
              accessibilityRole="button"
              accessibilityLabel="Back up timeline"
              accessibilityHint="Opens account sign in"
            >
              <Text style={styles.primaryLabel} allowFontScaling>
                Back up timeline
              </Text>
            </Touchable>
            <Touchable
              style={styles.secondaryButton}
              onPress={() => {
                haptics.select();
                onNotNow();
              }}
              accessibilityRole="button"
              accessibilityLabel="Not now"
            >
              <Text style={styles.secondaryLabel} allowFontScaling>
                Not now
              </Text>
            </Touchable>
          </View>
        </LiquidGlass>
      </View>
    </Modal>
  );
}
