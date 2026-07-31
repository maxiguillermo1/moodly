import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * @fileoverview Signed-in account panel with sync status and account actions.
 * @module features/account/components/AccountSignedInPanel
 */
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { GroupedRow, GroupedSection } from '@/components';
import { syncStatusLabel } from '../syncStatusLabel';
import { borderRadius, spacing, typography, useAppTheme } from '@/theme';
function syncStatusSymbol(status) {
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
export function AccountSignedInPanel({ user, syncStatus, syncDetail, refreshing, onRefreshSync, onSignOut, onDeleteAccount, }) {
    const { system: s } = useAppTheme();
    const statusCopy = syncStatusLabel(syncStatus, syncDetail);
    const statusIcon = syncStatusSymbol(syncStatus);
    const styles = useMemo(() => StyleSheet.create({
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
    }), [s]);
    const handleSignOut = useCallback(() => {
        Alert.alert('Sign out', 'Local copies of your journal will be cleared from this device. Cloud data stays safe.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign out',
                style: 'destructive',
                onPress: () => {
                    void onSignOut();
                },
            },
        ]);
    }, [onSignOut]);
    const handleDeleteAccount = useCallback(() => {
        Alert.alert('Delete account', 'This permanently deletes your Kairo account and all cloud journal data. This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    void (async () => {
                        const result = await onDeleteAccount();
                        if (!result.ok)
                            Alert.alert('Delete failed', result.message ?? 'Please try again.');
                    })();
                },
            },
        ]);
    }, [onDeleteAccount]);
    return (_jsxs(_Fragment, { children: [_jsxs(View, { style: styles.successCard, accessibilityRole: "summary", children: [_jsx(Text, { style: styles.successTitle, allowFontScaling: true, maxFontSizeMultiplier: 1.3, children: "You're signed in" }), _jsx(Text, { style: styles.successBody, allowFontScaling: true, maxFontSizeMultiplier: 1.35, children: "Your mood timeline is backing up to the cloud. This device keeps a local cache for fast loading and offline viewing." })] }), _jsxs(GroupedSection, { header: "ACCOUNT", children: [_jsx(GroupedRow, { symbol: { name: 'mail-outline', wellColor: s.blue }, label: "Email", value: user.email ?? 'Apple / Google account', showChevron: false, isFirst: true }), _jsx(GroupedRow, { symbol: { name: statusIcon.name, wellColor: statusIcon.color }, label: "Sync", showChevron: false, right: _jsxs(View, { style: styles.syncRow, children: [syncStatus === 'syncing' || refreshing ? (_jsx(ActivityIndicator, { color: s.blue, size: "small" })) : null, _jsx(Text, { style: { ...typography.body, color: s.secondaryLabel, maxWidth: 180 }, numberOfLines: 2, allowFontScaling: true, children: statusCopy })] }), isLast: true })] }), _jsxs(GroupedSection, { children: [_jsx(GroupedRow, { symbol: { name: 'refresh-outline', wellColor: s.teal }, label: "Sync now", showChevron: false, onPress: refreshing ? undefined : () => void onRefreshSync(), accessibilityState: { disabled: refreshing, busy: refreshing }, right: refreshing ? _jsx(ActivityIndicator, { color: s.blue }) : undefined, isFirst: true }), _jsx(GroupedRow, { symbol: { name: 'log-out-outline', wellColor: s.orange }, label: "Sign out", destructive: true, showChevron: false, onPress: handleSignOut }), _jsx(GroupedRow, { symbol: { name: 'trash-outline', wellColor: s.red }, label: "Delete account", destructive: true, showChevron: false, onPress: handleDeleteAccount, isLast: true })] }), _jsx(Text, { style: {
                    ...typography.footnote,
                    color: s.secondaryLabel,
                    paddingHorizontal: spacing[4],
                    paddingTop: spacing[2],
                    lineHeight: 17,
                }, allowFontScaling: true, maxFontSizeMultiplier: 1.35, children: "Your mood timeline, journal entries, habits, and goals are stored securely in Supabase with row-level security. Only your account can access them." })] }));
}
