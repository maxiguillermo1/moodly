/**
 * @fileoverview Supabase public configuration (Expo env).
 * @module cloud/config
 */
function readEnv(key) {
    const v = process.env[key];
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}
/** Returns Supabase config when both URL and anon key are set. */
export function getSupabaseConfig() {
    const url = readEnv('EXPO_PUBLIC_SUPABASE_URL');
    const anonKey = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    return {
        url: url ?? '',
        anonKey: anonKey ?? '',
        enabled: Boolean(url && anonKey),
    };
}
/** Returns the Supabase Auth storage key (matches @supabase/supabase-js default). */
export function getSupabaseAuthStorageKey() {
    const { url } = getSupabaseConfig();
    if (!url) {
        return 'kairo.supabase.auth.session';
    }
    try {
        const projectRef = new URL(url).hostname.split('.')[0];
        return `sb-${projectRef}-auth-token`;
    }
    catch {
        return 'kairo.supabase.auth.session';
    }
}
export function getAuthRedirectUri() {
    return `${KAIRO_AUTH_REDIRECT_SCHEME}://auth/callback`;
}
