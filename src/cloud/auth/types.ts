/**
 * @fileoverview Auth types for Kairo cloud account.
 * @module cloud/auth/types
 */

import type { Session, User } from '@supabase/supabase-js';

export type AuthState = {
  initialized: boolean;
  /** True while first cloud restore runs after a fresh sign-in (blocks login → app transition). */
  restoring: boolean;
  session: Session | null;
  user: User | null;
};

export type SignInResult =
  | { ok: true }
  | { ok: false; message: string };

export type AuthProviderId = 'apple' | 'google' | 'email';
