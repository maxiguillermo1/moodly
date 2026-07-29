/**
 * @fileoverview Account & cloud sync screen.
 * @module features/account/screens/AccountScreen
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GroupedRow, GroupedSection, ScreenHeader } from '@/components';
import { AccountAuthForm } from '../components/AccountAuthForm';
import { AccountSignedInPanel } from '../components/AccountSignedInPanel';
import { useAuth } from '@/hooks/useAuth';
import { useCloudSyncStatus } from '@/hooks/useCloudSyncStatus';
import { spacing, useAppTheme } from '@/theme';
import { Touchable } from '@/ui/Touchable';

export default function AccountScreen() {
  const navigation = useNavigation();
  const { system: s, groupedCanvas } = useAppTheme();
  const {
    cloudEnabled,
    initialized,
    user,
    signInEmail,
    signUpEmail,
    signInApple,
    signInGoogle,
    signOutUser,
    deleteAccount,
    refreshSync,
  } = useAuth();
  const { status, detail } = useCloudSyncStatus();
  const [refreshing, setRefreshing] = useState(false);

  const backAccessory = useMemo(
    () => (
      <Touchable onPress={() => navigation.goBack()} accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={28} color={s.blue} />
      </Touchable>
    ),
    [navigation, s.blue]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: groupedCanvas },
        scroll: { paddingTop: spacing[2], paddingBottom: 120 },
        loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
      }),
    [groupedCanvas]
  );

  const handleRefreshSync = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshSync();
    } finally {
      setRefreshing(false);
    }
  }, [refreshSync]);

  if (!cloudEnabled) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Account" leftAccessory={backAccessory} showSettings={false} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <GroupedSection>
            <GroupedRow label="Cloud sync unavailable" value="Configure Supabase env" showChevron={false} />
          </GroupedSection>
          <Text
            style={{
              color: s.secondaryLabel,
              fontSize: 13,
              paddingHorizontal: spacing[4],
              paddingTop: spacing[2],
              lineHeight: 17,
            }}
            allowFontScaling
          >
            Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable cloud backup and
            sync (see docs/SUPABASE.md).
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!initialized) {
    return (
      <SafeAreaView style={[styles.container, styles.loading]} edges={['top']}>
        <ActivityIndicator color={s.blue} accessibilityLabel="Loading account" />
      </SafeAreaView>
    );
  }

  const body = user ? (
    <AccountSignedInPanel
      user={user}
      syncStatus={status}
      syncDetail={detail}
      refreshing={refreshing || status === 'syncing'}
      onRefreshSync={handleRefreshSync}
      onSignOut={signOutUser}
      onDeleteAccount={deleteAccount}
    />
  ) : (
    <AccountAuthForm
      onSignInEmail={signInEmail}
      onSignUpEmail={signUpEmail}
      onSignInApple={signInApple}
      onSignInGoogle={signInGoogle}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Account" leftAccessory={backAccessory} showSettings={false} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
