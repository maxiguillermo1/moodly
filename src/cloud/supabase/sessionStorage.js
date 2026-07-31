/**
 * @fileoverview Secure session storage adapter for Supabase Auth.
 * @module cloud/supabase/sessionStorage
 */
import * as SecureStore from 'expo-secure-store';
import { getSupabaseAuthStorageKey } from '../config';
import { logger } from '../../lib/security/logger';

const LEGACY_STORAGE_KEY = 'kairo.supabase.auth.session';

function resolveStorageKey(key) {
    if (key === 'supabase.auth.token' || key === LEGACY_STORAGE_KEY) {
        return getSupabaseAuthStorageKey();
    }
    return key;
}

export const supabaseSecureStorage = {
    async getItem(key) {
        try {
            return await SecureStore.getItemAsync(resolveStorageKey(key));
        }
        catch (e) {
            logger.warn('auth.secureStore.read_failed', { op: 'getItem', error: e });
            return null;
        }
    },
    async setItem(key, value) {
        try {
            await SecureStore.setItemAsync(resolveStorageKey(key), value);
        }
        catch (e) {
            logger.warn('auth.secureStore.write_failed', { op: 'setItem', error: e });
        }
    },
    async removeItem(key) {
        const resolved = resolveStorageKey(key);
        try {
            await SecureStore.deleteItemAsync(resolved);
        }
        catch (e) {
            logger.warn('auth.secureStore.write_failed', { op: 'removeItem', error: e });
            throw e;
        }
    },
};

export async function clearSupabaseSessionStorage() {
    const keys = new Set([getSupabaseAuthStorageKey(), LEGACY_STORAGE_KEY, 'supabase.auth.token']);
    for (const key of keys) {
        try {
            await SecureStore.deleteItemAsync(key);
        }
        catch (e) {
            logger.warn('auth.secureStore.write_failed', { op: 'clearSession', key, error: e });
        }
    }
}
