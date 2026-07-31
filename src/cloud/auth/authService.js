/**
 * @fileoverview Supabase Auth service (Apple, Google, email/password).
 * @module cloud/auth/authService
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { getAuthRedirectUri, getSupabaseConfig } from '../config';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client';
import { clearSupabaseSessionStorage } from '../supabase/sessionStorage';
import { createSessionFromOAuthCallbackUrl } from './oauthCallback';
import { clearCachedAuthSession, setCachedAuthSession } from './authSessionCache';
WebBrowser.maybeCompleteAuthSession();
let interactiveAuthInFlight = null;
function requireClient() {
    const client = getSupabaseClient();
    if (!client) {
        throw new Error('[auth] Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    }
    return client;
}
async function createAppleNonce() {
    const raw = Crypto.randomUUID();
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw, {
        encoding: Crypto.CryptoEncoding.HEX,
    });
    return { raw, hashed };
}
async function saveAppleFullNameIfPresent(credential) {
    if (!credential.fullName)
        return;
    const parts = [
        credential.fullName.givenName,
        credential.fullName.middleName,
        credential.fullName.familyName,
    ].filter(Boolean);
    if (parts.length === 0)
        return;
    const client = getSupabaseClient();
    if (!client)
        return;
    await client.auth.updateUser({
        data: {
            full_name: parts.join(' '),
            given_name: credential.fullName.givenName ?? undefined,
            family_name: credential.fullName.familyName ?? undefined,
        },
    });
}
export async function restoreAuthSession() {
    if (!isSupabaseConfigured())
        return null;
    const client = getSupabaseClient();
    if (!client)
        return null;
    const { data, error } = await client.auth.getSession();
    if (error)
        return null;
    setCachedAuthSession(data.session);
    return data.session;
}
export async function signInWithEmail(email, password) {
    try {
        const client = requireClient();
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error)
            return { ok: false, message: error.message };
        return { ok: true };
    }
    catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : 'Sign in failed' };
    }
}
export async function signUpWithEmail(email, password) {
    try {
        const client = requireClient();
        const { data, error } = await client.auth.signUp({ email: email.trim(), password });
        if (error)
            return { ok: false, message: error.message };
        if (!data.session) {
            return {
                ok: false,
                message: 'Check your email to confirm your account, then sign in.',
            };
        }
        return { ok: true };
    }
    catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : 'Sign up failed' };
    }
}
async function signInWithAppleNative() {
    try {
        const available = await AppleAuthentication.isAvailableAsync();
        if (!available)
            return { ok: false, message: 'Sign in with Apple is not available on this device.' };
        const nonce = await createAppleNonce();
        const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce: nonce.hashed,
        });
        if (!credential.identityToken) {
            return { ok: false, message: 'Apple sign in did not return an identity token.' };
        }
        const client = requireClient();
        const { error } = await client.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
            nonce: nonce.raw,
        });
        if (error)
            return { ok: false, message: error.message };
        await saveAppleFullNameIfPresent(credential);
        return { ok: true };
    }
    catch (e) {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') {
            return { ok: false, message: 'Sign in cancelled.' };
        }
        return { ok: false, message: e instanceof Error ? e.message : 'Apple sign in failed' };
    }
}
function oauthBrowserMessage(resultType) {
    if (resultType === 'locked') {
        return 'Finish signing in in your browser, then return to Kairo.';
    }
    return 'Sign in cancelled.';
}
async function runInteractiveAuth(op) {
    if (interactiveAuthInFlight)
        return interactiveAuthInFlight;
    interactiveAuthInFlight = op();
    try {
        return await interactiveAuthInFlight;
    }
    finally {
        interactiveAuthInFlight = null;
    }
}
async function signInWithOAuthProvider(provider) {
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
        if (error)
            return { ok: false, message: error.message };
        if (!data.url)
            return { ok: false, message: 'OAuth URL missing' };
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== 'success' || !result.url) {
            return { ok: false, message: oauthBrowserMessage(result.type) };
        }
        return createSessionFromOAuthCallbackUrl(client, result.url);
    }
    catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : 'OAuth sign in failed' };
    }
}
export async function signInWithApple() {
    if (!getSupabaseConfig().enabled) {
        return { ok: false, message: 'Cloud sync is not configured.' };
    }
    return runInteractiveAuth(async () => {
        if (Platform.OS === 'ios') {
            return signInWithAppleNative();
        }
        return signInWithOAuthProvider('apple');
    });
}
export async function signInWithGoogle() {
    if (!getSupabaseConfig().enabled) {
        return { ok: false, message: 'Cloud sync is not configured.' };
    }
    return runInteractiveAuth(() => signInWithOAuthProvider('google'));
}
export async function signOut() {
    const client = getSupabaseClient();
    if (client) {
        await client.auth.signOut();
    }
    clearCachedAuthSession();
    await clearSupabaseSessionStorage();
}
export async function deleteCloudAccount() {
    try {
        const client = requireClient();
        const { error } = await client.rpc('delete_own_account');
        if (error)
            return { ok: false, message: error.message };
        await signOut();
        return { ok: true };
    }
    catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : 'Account deletion failed' };
    }
}
export function onAuthStateChange(callback) {
    const client = getSupabaseClient();
    if (!client)
        return () => { };
    const { data } = client.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
    return () => data.subscription.unsubscribe();
}
/** @internal Jest only */
export function resetAuthServiceSessionStateForTests() {
    interactiveAuthInFlight = null;
    clearCachedAuthSession();
}
