/**
 * @fileoverview Supabase client singleton.
 * @module cloud/supabase/client
 */
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../config';
import { supabaseSecureStorage } from './sessionStorage';
let client = null;
export function isSupabaseConfigured() {
    return getSupabaseConfig().enabled;
}
export function getSupabaseClient() {
    if (!isSupabaseConfigured())
        return null;
    if (client)
        return client;
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
export function resetSupabaseClientForTests() {
    client = null;
}
