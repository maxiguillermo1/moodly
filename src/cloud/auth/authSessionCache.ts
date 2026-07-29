/**
 * @fileoverview In-memory auth session cache — avoids SecureStore round-trips on every local write.
 * @module cloud/auth/authSessionCache
 */

import type { Session } from '@supabase/supabase-js';

let cachedSession: Session | null = null;

export function getCachedAuthSession(): Session | null {
  return cachedSession;
}

export function setCachedAuthSession(session: Session | null): void {
  cachedSession = session;
}

export function clearCachedAuthSession(): void {
  cachedSession = null;
}

/** @internal Jest */
export function resetAuthSessionCacheForTests(): void {
  cachedSession = null;
}
