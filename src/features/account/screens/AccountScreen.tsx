/**
 * @fileoverview Account & cloud sync screen.
 * @module features/account/screens/AccountScreen
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GroupedRow, GroupedSection, ScreenHeader } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useCloudSyncStatus } from '@/hooks/useCloudSyncStatus';
import { spacing, useAppTheme } from '@/theme';
import { haptics } from '@/system/haptics';
import { Touchable } from '@/ui/Touchable';

function syncStatusLabel(status: string, detail?: string): string {
  switch (status) {
    case 'syncing':
      return 'Syncing…';
    case 'saved':
      return 'Saved to cloud';
    case 'offline':
      return detail ?? 'Offline — changes will sync when online';
    case 'error':
      return detail ?? 'Sync error';
    default:
      return 'Up to date';
  }
}

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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
        input: {
          backgroundColor: s.secondaryBackground,
          borderRadius: 10,
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
          color: s.label,
          fontSize: 17,
          marginBottom: spacing[2],
        },
        hint: {
          color: s.secondaryLabel,
          fontSize: 13,
          paddingHorizontal: spacing[4],
          paddingBottom: spacing[2],
        },
        rowPad: { paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
      }),
    [groupedCanvas, s]
  );

  const runAuth = useCallback(
    async (fn: () => Promise<{ ok: boolean; message?: string }>, successTitle: string) => {
      try {
        haptics.select();
        const result = await fn();
        if (!result.ok) {
          Alert.alert('Could not continue', result.message ?? 'Please try again.');
          return;
        }
        Alert.alert(successTitle, user ? 'You are signed in.' : 'Welcome back. Your data is syncing.');
      } catch {
        Alert.alert('Could not continue', 'Please try again.');
      }
    },
    [user]
  );

  const handleSignIn = useCallback(() => {
    void runAuth(() => signInEmail(email, password), 'Signed in');
  }, [email, password, runAuth, signInEmail]);

  const handleSignUp = useCallback(() => {
    void runAuth(() => signUpEmail(email, password), 'Account created');
  }, [email, password, runAuth, signUpEmail]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Local copies of your journal will be cleared from this device. Cloud data stays safe.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOutUser();
        },
      },
    ]);
  }, [signOutUser]);

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
              const result = await deleteAccount();
              if (!result.ok) Alert.alert('Delete failed', result.message ?? 'Please try again.');
            })();
          },
        },
      ]
    );
  }, [deleteAccount]);

  if (!cloudEnabled) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Account" leftAccessory={backAccessory} showSettings={false} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <GroupedSection>
            <GroupedRow label="Cloud sync unavailable" value="Configure Supabase env" />
          </GroupedSection>
          <Text style={styles.hint}>
            Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable cloud backup and sync.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!initialized) {
    return (
      <SafeAreaView style={[styles.container, styles.rowPad]}>
        <ActivityIndicator color={s.blue} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Account" leftAccessory={backAccessory} showSettings={false} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {user ? (
          <>
            <GroupedSection header="SIGNED IN">
              <GroupedRow label="Email" value={user.email ?? 'Apple / Google account'} />
              <GroupedRow label="Sync" value={syncStatusLabel(status, detail)} />
            </GroupedSection>
            <GroupedSection>
              <GroupedRow label="Sync now" onPress={() => void refreshSync()} />
              <GroupedRow label="Sign out" destructive onPress={handleSignOut} />
              <GroupedRow label="Delete account" destructive onPress={handleDeleteAccount} />
            </GroupedSection>
            <Text style={styles.hint}>
              Your mood timeline, journal entries, habits, and goals are stored securely in Supabase. This device keeps a
              local cache for fast loading and offline viewing.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              Sign in to keep your private journal safe across devices, reinstalls, and phone upgrades.
            </Text>
            <View style={styles.rowPad}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={s.secondaryLabel}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={s.secondaryLabel}
                secureTextEntry
                textContentType="password"
                value={password}
                onChangeText={setPassword}
              />
            </View>
            <GroupedSection>
              <GroupedRow label="Sign in" onPress={handleSignIn} />
              <GroupedRow label="Create account" onPress={handleSignUp} />
            </GroupedSection>
            {Platform.OS === 'ios' ? (
              <GroupedSection header="OR">
                <GroupedRow label="Sign in with Apple" onPress={() => void runAuth(signInApple, 'Signed in')} />
              </GroupedSection>
            ) : null}
            <GroupedSection>
              <GroupedRow label="Sign in with Google" onPress={() => void runAuth(signInGoogle, 'Signed in')} />
            </GroupedSection>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
