/**
 * @fileoverview Supabase public configuration (Expo env).
 * @module cloud/config
 */

export type SupabaseConfig = {
  url: string;
  anonKey: string;
  enabled: boolean;
};

function readEnv(key: string): string | undefined {
  const v = process.env[key];
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

/** Returns Supabase config when both URL and anon key are set. */
export function getSupabaseConfig(): SupabaseConfig {
  const url = readEnv('EXPO_PUBLIC_SUPABASE_URL');
  const anonKey = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  return {
    url: url ?? '',
    anonKey: anonKey ?? '',
    enabled: Boolean(url && anonKey),
  };
}

/** OAuth redirect scheme — must match app.config.ts `scheme`. */
export const MOODLY_AUTH_REDIRECT_SCHEME = 'moodly';

export function getAuthRedirectUri(): string {
  return `${MOODLY_AUTH_REDIRECT_SCHEME}://auth/callback`;
}
