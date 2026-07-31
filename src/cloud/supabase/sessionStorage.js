/**
 * @fileoverview Secure session storage adapter for Supabase Auth.
 * @module cloud/supabase/sessionStorage
 */
import * as SecureStore from 'expo-secure-store';
import { logger } from '../../lib/security/logger';
const STORAGE_KEY = 'kairo.supabase.auth.session';
export const supabaseSecureStorage = {
    async getItem(key) {
        try {
            return await SecureStore.getItemAsync(key === 'supabase.auth.token' ? STORAGE_KEY : key);
        }
        catch (e) {
            logger.warn('auth.secureStore.read_failed', { op: 'getItem', error: e });
            return null;
        }
    },
    async setItem(key, value) {
        try {
            await SecureStore.setItemAsync(key === 'supabase.auth.token' ? STORAGE_KEY : key, value);
        }
        catch (e) {
            logger.warn('auth.secureStore.write_failed', { op: 'setItem', error: e });
        }
    },
    async removeItem(key) {
        try {
            await SecureStore.deleteItemAsync(key === 'supabase.auth.token' ? STORAGE_KEY : key);
        }
        catch (e) {
            logger.warn('auth.secureStore.write_failed', { op: 'removeItem', error: e });
        }
    },
};
export async function clearSupabaseSessionStorage() {
    try {
        await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
    catch (e) {
        logger.warn('auth.secureStore.write_failed', { op: 'clearSession', error: e });
    }
}
