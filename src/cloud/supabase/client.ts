/**
 * @fileoverview Supabase client singleton.
 * @module cloud/supabase/client
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config';
import { supabaseSecureStorage } from './sessionStorage';

export type KairoSupabaseClient = SupabaseClient;

let client: KairoSupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().enabled;
}

export function getSupabaseClient(): KairoSupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  const { url, anonKey } = getSupabaseConfig();
  client = createClient(url, anonKey, {
    auth: {
      storage: supabaseSecureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

/** @internal Jest — reset singleton. */
export function resetSupabaseClientForTests(): void {
  client = null;
}
