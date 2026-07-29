/**
 * @fileoverview Signed-in account panel with sync status and account actions.
 * @module features/account/components/AccountSignedInPanel
 */

import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { User } from '@supabase/supabase-js';
import { GroupedRow, GroupedSection } from '@/components';
import type { SyncStatus } from '@/hooks/useCloudSyncStatus';
import { syncStatusLabel } from '../syncStatusLabel';
import { borderRadius, spacing, typography, useAppTheme } from '@/theme';

type AccountSignedInPanelProps = {
  user: User;
  syncStatus: SyncStatus;
  syncDetail?: string;
  refreshing: boolean;
  onRefreshSync: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<{ ok: boolean; message?: string }>;
};

function syncStatusSymbol(status: SyncStatus): { name: React.ComponentProps<typeof Ionicons>['name']; color: string } {
  switch (status) {
    case 'syncing':
      return { name: 'sync-outline', color: '#007AFF' };
    case 'saved':
      return { name: 'checkmark-circle-outline', color: '#34C759' };
    case 'offline':
      return { name: 'cloud-offline-outline', color: '#FF9500' };
    case 'error':
      return { name: 'alert-circle-outline', color: '#FF3B30' };
    default:
      return { name: 'cloud-done-outline', color: '#34C759' };
  }
}

export function AccountSignedInPanel({
  user,
  syncStatus,
  syncDetail,
  refreshing,
  onRefreshSync,
  onSignOut,
  onDeleteAccount,
}: AccountSignedInPanelProps): React.ReactElement {
  const { system: s } = useAppTheme();
  const statusCopy = syncStatusLabel(syncStatus, syncDetail);
  const statusIcon = syncStatusSymbol(syncStatus);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        successCard: {
          marginHorizontal: spacing[4],
          marginBottom: spacing[4],
          padding: spacing[4],
          borderRadius: borderRadius.xl,
          backgroundColor: s.secondaryBackground,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: s.separator,
        },
        successTitle: {
          ...typography.title3,
          color: s.label,
          marginBottom: spacing[1],
        },
        successBody: {
          ...typography.subhead,
          color: s.secondaryLabel,
          lineHeight: 21,
        },
        syncRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
        },
      }),
    [s]
  );

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign out',
      'Local copies of your journal will be cleared from this device. Cloud data stays safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            void onSignOut();
          },
        },
      ]
    );
  }, [onSignOut]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your Kairo account and all cloud journal data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const result = await onDeleteAccount();
              if (!result.ok) Alert.alert('Delete failed', result.message ?? 'Please try again.');
            })();
          },
        },
      ]
    );
  }, [onDeleteAccount]);

  return (
    <>
      <View style={styles.successCard} accessibilityRole="summary">
        <Text style={styles.successTitle} allowFontScaling maxFontSizeMultiplier={1.3}>
          You're signed in
        </Text>
        <Text style={styles.successBody} allowFontScaling maxFontSizeMultiplier={1.35}>
          Your mood timeline is backing up to the cloud. This device keeps a local cache for fast
          loading and offline viewing.
        </Text>
      </View>

      <GroupedSection header="ACCOUNT">
        <GroupedRow
          symbol={{ name: 'mail-outline', wellColor: s.blue }}
          label="Email"
          value={user.email ?? 'Apple / Google account'}
          showChevron={false}
          isFirst
        />
        <GroupedRow
          symbol={{ name: statusIcon.name, wellColor: statusIcon.color }}
          label="Sync"
          showChevron={false}
          right={
            <View style={styles.syncRow}>
              {syncStatus === 'syncing' || refreshing ? (
                <ActivityIndicator color={s.blue} size="small" />
              ) : null}
              <Text
                style={{ ...typography.body, color: s.secondaryLabel, maxWidth: 180 }}
                numberOfLines={2}
                allowFontScaling
              >
                {statusCopy}
              </Text>
            </View>
          }
          isLast
        />
      </GroupedSection>

      <GroupedSection>
        <GroupedRow
          symbol={{ name: 'refresh-outline', wellColor: s.teal }}
          label="Sync now"
          showChevron={false}
          onPress={refreshing ? undefined : () => void onRefreshSync()}
          accessibilityState={{ disabled: refreshing, busy: refreshing }}
          right={refreshing ? <ActivityIndicator color={s.blue} /> : undefined}
          isFirst
        />
        <GroupedRow
          symbol={{ name: 'log-out-outline', wellColor: s.orange }}
          label="Sign out"
          destructive
          showChevron={false}
          onPress={handleSignOut}
        />
        <GroupedRow
          symbol={{ name: 'trash-outline', wellColor: s.red }}
          label="Delete account"
          destructive
          showChevron={false}
          onPress={handleDeleteAccount}
          isLast
        />
      </GroupedSection>

      <Text
        style={{
          ...typography.footnote,
          color: s.secondaryLabel,
          paddingHorizontal: spacing[4],
          paddingTop: spacing[2],
          lineHeight: 17,
        }}
        allowFontScaling
        maxFontSizeMultiplier={1.35}
      >
        Your mood timeline, journal entries, habits, and goals are stored securely in Supabase with
        row-level security. Only your account can access them.
      </Text>
    </>
  );
}
