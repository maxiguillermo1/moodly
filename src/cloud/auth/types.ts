/**
 * @fileoverview Auth types for Kairo cloud account.
 * @module cloud/auth/types
 */

import type { Session, User } from '@supabase/supabase-js';

export type AuthState = {
  initialized: boolean;
  session: Session | null;
  user: User | null;
};

export type SignInResult =
  | { ok: true }
  | { ok: false; message: string };

export type AuthProviderId = 'apple' | 'google' | 'email';
