/**
 * @fileoverview Secure session storage adapter for Supabase Auth.
 * @module cloud/supabase/sessionStorage
 */

import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'kairo.supabase.auth.session';

export const supabaseSecureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key === 'supabase.auth.token' ? STORAGE_KEY : key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key === 'supabase.auth.token' ? STORAGE_KEY : key, value);
    } catch {
      /* best-effort */
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key === 'supabase.auth.token' ? STORAGE_KEY : key);
    } catch {
      /* best-effort */
    }
  },
};

export async function clearSupabaseSessionStorage(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    /* best-effort */
  }
}
