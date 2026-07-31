import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * @fileoverview Email and OAuth sign-in / sign-up form for account onboarding.
 * @module features/account/components/AccountAuthForm
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, View, } from 'react-native';
import { GroupedRow, GroupedSection } from '@/components';
import { useAuthProviders } from '@/hooks/useAuthProviders';
import { spacing, typography, useAppTheme } from '@/theme';
import { haptics } from '@/system/haptics';
import { Touchable } from '@/ui/Touchable';
import { AccountWelcomeHero } from './AccountWelcomeHero';
const MIN_PASSWORD_LENGTH = 6;
function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function AccountAuthForm({ variant = 'account', onContinueOffline, continuingOffline = false, onSignInEmail, onSignUpEmail, onSignInApple, onSignInGoogle, }) {
    const { system: s } = useAppTheme();
    const isGate = variant === 'gate';
    const [mode, setMode] = useState('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busyAction, setBusyAction] = useState(null);
    const busy = busyAction !== null || continuingOffline;
    const [fieldError, setFieldError] = useState(null);
    const { apple: appleEnabled, google: googleEnabled, loaded: providersLoaded } = useAuthProviders();
    const showApple = providersLoaded && appleEnabled && Platform.OS === 'ios';
    const showGoogle = providersLoaded && googleEnabled;
    const showOAuthSection = showApple || showGoogle;
    const styles = useMemo(() => StyleSheet.create({
        inputBlock: {
            paddingHorizontal: spacing[4],
            paddingBottom: spacing[2],
        },
        input: {
            backgroundColor: s.secondaryBackground,
            borderRadius: 10,
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[2],
            color: s.label,
            fontSize: 17,
            marginBottom: spacing[2],
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: s.separator,
        },
        fieldError: {
            ...typography.footnote,
            color: s.red,
            paddingHorizontal: spacing[4],
            paddingBottom: spacing[2],
        },
        modeToggle: {
            paddingHorizontal: spacing[4],
            paddingTop: spacing[1],
            paddingBottom: spacing[3],
        },
        modeToggleText: {
            ...typography.subhead,
            color: s.blue,
            textAlign: 'center',
        },
        footnote: {
            ...typography.footnote,
            color: s.secondaryLabel,
            paddingHorizontal: spacing[4],
            paddingTop: spacing[2],
            lineHeight: 17,
        },
        syncHeader: {
            ...typography.footnote,
            fontWeight: '600',
            color: s.secondaryLabel,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            paddingHorizontal: spacing[4],
            paddingBottom: spacing[2],
        },
    }), [s]);
    const toggleMode = useCallback(() => {
        haptics.select();
        setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
        setFieldError(null);
    }, []);
    const validate = useCallback(() => {
        const trimmedEmail = email.trim();
        if (!trimmedEmail)
            return 'Enter your email address.';
        if (!isValidEmail(trimmedEmail))
            return 'Enter a valid email address.';
        if (!password)
            return 'Enter your password.';
        if (mode === 'signUp' && password.length < MIN_PASSWORD_LENGTH) {
            return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
        }
        return null;
    }, [email, mode, password]);
    const runAuth = useCallback(async (fn) => {
        const validationError = validate();
        if (validationError) {
            setFieldError(validationError);
            return;
        }
        setFieldError(null);
        setBusyAction('email');
        try {
            haptics.select();
            const result = await fn();
            if (!result.ok) {
                Alert.alert('Could not sign in', result.message ?? 'Please try again.');
            }
        }
        catch {
            Alert.alert('Could not sign in', 'Please try again.');
        }
        finally {
            setBusyAction(null);
        }
    }, [validate]);
    const runOAuth = useCallback(async (provider, fn) => {
        if (busy)
            return;
        setFieldError(null);
        setBusyAction(provider);
        try {
            haptics.select();
            const result = await fn();
            if (!result.ok && result.message !== 'Sign in cancelled.') {
                Alert.alert('Could not sign in', result.message ?? 'Please try again.');
            }
        }
        catch {
            Alert.alert('Could not sign in', 'Please try again.');
        }
        finally {
            setBusyAction(null);
        }
    }, [busy]);
    const handlePrimary = useCallback(() => {
        const trimmedEmail = email.trim();
        if (mode === 'signUp') {
            void runAuth(() => onSignUpEmail(trimmedEmail, password));
            return;
        }
        void runAuth(() => onSignInEmail(trimmedEmail, password));
    }, [email, mode, onSignInEmail, onSignUpEmail, password, runAuth]);
    const primaryLabel = mode === 'signUp' ? 'Create account' : 'Sign in';
    const toggleLabel = mode === 'signUp' ? 'Already have an account? Sign in' : "Don't have an account? Create one";
    const syncSectionHeader = isGate ? 'OPTIONAL — BACK UP & SYNC' : undefined;
    return (_jsxs(_Fragment, { children: [isGate ? _jsx(AccountWelcomeHero, {}) : null, isGate ? (_jsx(GroupedSection, { children: _jsx(GroupedRow, { symbol: { name: 'phone-portrait-outline', wellColor: s.blue }, label: "Continue offline", showChevron: false, onPress: busy || !onContinueOffline ? undefined : onContinueOffline, accessibilityState: { disabled: busy, busy: continuingOffline }, right: continuingOffline ? _jsx(ActivityIndicator, { color: s.blue }) : undefined, isFirst: true, isLast: true }) })) : null, isGate ? (_jsx(Text, { style: styles.footnote, allowFontScaling: true, maxFontSizeMultiplier: 1.35, children: "No account required. Your mood map and journal stay on this device until you choose to sign in." })) : null, syncSectionHeader ? (_jsx(Text, { style: styles.syncHeader, allowFontScaling: true, maxFontSizeMultiplier: 1.3, children: syncSectionHeader })) : null, _jsxs(View, { style: styles.inputBlock, children: [_jsx(TextInput, { style: styles.input, placeholder: "Email", placeholderTextColor: s.secondaryLabel, autoCapitalize: "none", autoCorrect: false, keyboardType: "email-address", textContentType: "emailAddress", autoComplete: "email", editable: !busy, value: email, onChangeText: (value) => {
                            setEmail(value);
                            if (fieldError)
                                setFieldError(null);
                        }, accessibilityLabel: "Email" }), _jsx(TextInput, { style: styles.input, placeholder: "Password", placeholderTextColor: s.secondaryLabel, secureTextEntry: true, textContentType: mode === 'signUp' ? 'newPassword' : 'password', autoComplete: mode === 'signUp' ? 'new-password' : 'password', returnKeyType: "done", editable: !busy, value: password, onChangeText: (value) => {
                            setPassword(value);
                            if (fieldError)
                                setFieldError(null);
                        }, onSubmitEditing: busy ? undefined : handlePrimary, accessibilityLabel: "Password" })] }), fieldError ? (_jsx(Text, { style: styles.fieldError, accessibilityRole: "alert", allowFontScaling: true, children: fieldError })) : null, _jsx(GroupedSection, { children: _jsx(GroupedRow, { label: primaryLabel, showChevron: false, onPress: busy ? undefined : handlePrimary, accessibilityState: { disabled: busy, busy: busyAction === 'email' }, right: busyAction === 'email' ? _jsx(ActivityIndicator, { color: s.blue }) : undefined, isFirst: true, isLast: true }) }), _jsx(Touchable, { onPress: toggleMode, disabled: busy, accessibilityRole: "button", accessibilityLabel: toggleLabel, style: styles.modeToggle, children: _jsx(Text, { style: styles.modeToggleText, allowFontScaling: true, children: toggleLabel }) }), showOAuthSection ? (_jsxs(GroupedSection, { header: "OR", children: [showApple ? (_jsx(GroupedRow, { symbol: { name: 'logo-apple', wellColor: s.label }, label: "Sign in with Apple", showChevron: false, onPress: busy ? undefined : () => void runOAuth('apple', onSignInApple), accessibilityState: { disabled: busy, busy: busyAction === 'apple' }, right: busyAction === 'apple' ? _jsx(ActivityIndicator, { color: s.blue }) : undefined, isFirst: showApple, isLast: !showGoogle })) : null, showGoogle ? (_jsx(GroupedRow, { symbol: { name: 'logo-google', wellColor: '#4285F4' }, label: "Sign in with Google", showChevron: false, onPress: busy ? undefined : () => void runOAuth('google', onSignInGoogle), accessibilityState: { disabled: busy, busy: busyAction === 'google' }, right: busyAction === 'google' ? _jsx(ActivityIndicator, { color: s.blue }) : undefined, isFirst: !showApple, isLast: true })) : null] })) : null, !isGate ? (_jsx(Text, { style: styles.footnote, allowFontScaling: true, maxFontSizeMultiplier: 1.35, children: "Cloud sync is optional. Your mood timeline stays on this device until you sign in." })) : null] }));
}
