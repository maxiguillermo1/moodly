/**
 * @fileoverview Supabase Auth service (Apple, Google, email/password).
 * @module cloud/auth/authService
 */

import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { getAuthRedirectUri, getSupabaseConfig } from '../config';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import { clearSupabaseSessionStorage } from '../supabase/sessionStorage';
import type { SignInResult } from './types';

WebBrowser.maybeCompleteAuthSession();

function requireClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('[auth] Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return client;
}

export async function restoreAuthSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) return null;
  return data.session;
}

export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  try {
    const client = requireClient();
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Sign in failed' };
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<SignInResult> {
  try {
    const client = requireClient();
    const { error } = await client.auth.signUp({ email: email.trim(), password });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Sign up failed' };
  }
}

export async function signInWithApple(): Promise<SignInResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, message: 'Sign in with Apple is available on iOS only.' };
  }
  try {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) return { ok: false, message: 'Sign in with Apple is not available on this device.' };

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      return { ok: false, message: 'Apple sign in did not return an identity token.' };
    }

    const client = requireClient();
    const { error } = await client.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'ERR_REQUEST_CANCELED') {
      return { ok: false, message: 'Sign in cancelled.' };
    }
    return { ok: false, message: e instanceof Error ? e.message : 'Apple sign in failed' };
  }
}

async function signInWithOAuthProvider(provider: 'google'): Promise<SignInResult> {
  try {
    const client = requireClient();
    const redirectTo = getAuthRedirectUri();
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error) return { ok: false, message: error.message };
    if (!data.url) return { ok: false, message: 'OAuth URL missing' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      return { ok: false, message: 'Sign in cancelled.' };
    }

    const parsed = Linking.parse(result.url);
    const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
    if (!code) return { ok: false, message: 'OAuth callback missing code.' };

    const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
    if (exchangeError) return { ok: false, message: exchangeError.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'OAuth sign in failed' };
  }
}

export async function signInWithGoogle(): Promise<SignInResult> {
  if (!getSupabaseConfig().enabled) {
    return { ok: false, message: 'Cloud sync is not configured.' };
  }
  return signInWithOAuthProvider('google');
}

export async function signOut(): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await client.auth.signOut();
  }
  await clearSupabaseSessionStorage();
}

export async function deleteCloudAccount(): Promise<SignInResult> {
  try {
    const client = requireClient();
    const { error } = await client.rpc('delete_own_account');
    if (error) return { ok: false, message: error.message };
    await signOut();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Account deletion failed' };
  }
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}
