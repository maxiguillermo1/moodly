/**
 * @fileoverview First-launch welcome gate when cloud is configured but the user is not signed in.
 * @module features/account/screens/AccountLoginScreen
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components';
import { AccountAuthForm } from '../components/AccountAuthForm';
import { useAuth } from '@/hooks/useAuth';
import { spacing, useAppTheme } from '@/theme';
import { haptics } from '@/system/haptics';

export default function AccountLoginScreen(): React.ReactElement {
  const { groupedCanvas, system: s } = useAppTheme();
  const { initialized, signInEmail, signUpEmail, signInApple, signInGoogle, continueOffline } =
    useAuth();
  const [continuingOffline, setContinuingOffline] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: groupedCanvas },
        scroll: { paddingTop: spacing[2], paddingBottom: 120 },
        loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
      }),
    [groupedCanvas]
  );

  const handleContinueOffline = useCallback(async () => {
    if (continuingOffline) return;
    setContinuingOffline(true);
    try {
      haptics.select();
      await continueOffline();
    } finally {
      setContinuingOffline(false);
    }
  }, [continueOffline, continuingOffline]);

  if (!initialized) {
    return (
      <SafeAreaView style={[styles.container, styles.loading]} edges={['top', 'bottom']}>
        <ActivityIndicator color={s.blue} accessibilityLabel="Loading welcome screen" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader title="Welcome" showSettings={false} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <AccountAuthForm
            variant="gate"
            onContinueOffline={handleContinueOffline}
            continuingOffline={continuingOffline}
            onSignInEmail={signInEmail}
            onSignUpEmail={signUpEmail}
            onSignInApple={signInApple}
            onSignInGoogle={signInGoogle}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
