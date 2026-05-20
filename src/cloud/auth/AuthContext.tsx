/**
 * @fileoverview Moodly cloud auth React context.
 * @module cloud/auth/AuthContext
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../supabase/client';
import {
  deleteCloudAccount,
  onAuthStateChange,
  restoreAuthSession,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
} from './authService';
import type { AuthState, SignInResult } from './types';
import { runInitialCloudRestore, runSyncCycle, onUserSignedOut } from '../sync/syncEngine';
import { registerMoodlyCloudPullApplier } from '../../data/sync/cloudPullApplier';
import { enqueueFullLocalSnapshotForCloud } from '../../data/sync/cloudSnapshotEnqueue';
import { clearLocalUserDataOnLogout } from '../../data/sync/cloudLogout';

type AuthContextValue = AuthState & {
  cloudEnabled: boolean;
  signInEmail: (email: string, password: string) => Promise<SignInResult>;
  signUpEmail: (email: string, password: string) => Promise<SignInResult>;
  signInApple: () => Promise<SignInResult>;
  signInGoogle: () => Promise<SignInResult>;
  signOutUser: () => Promise<void>;
  deleteAccount: () => Promise<SignInResult>;
  refreshSync: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function handleSignedIn(session: Session): Promise<void> {
  await registerMoodlyCloudPullApplier();
  await enqueueFullLocalSnapshotForCloud();
  await runInitialCloudRestore(session.user);
}

async function handleSignedOut(): Promise<void> {
  await onUserSignedOut();
  await clearLocalUserDataOnLogout();
}

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const cloudEnabled = isSupabaseConfigured();
  const [state, setState] = useState<AuthState>({
    initialized: !cloudEnabled,
    session: null,
    user: null,
  });
  const hadSessionRef = useRef(false);

  useEffect(() => {
    if (!cloudEnabled) return;

    let mounted = true;
    void (async () => {
      const session = await restoreAuthSession();
      if (!mounted) return;
      hadSessionRef.current = Boolean(session);
      setState({ initialized: true, session, user: session?.user ?? null });
      if (session) {
        await handleSignedIn(session);
      }
    })();

    const unsubscribe = onAuthStateChange(async (session) => {
      const wasSignedIn = hadSessionRef.current;
      setState({ initialized: true, session, user: session?.user ?? null });
      if (session) {
        hadSessionRef.current = true;
        await handleSignedIn(session);
      } else if (wasSignedIn) {
        hadSessionRef.current = false;
        await handleSignedOut();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [cloudEnabled]);

  const signInEmail = useCallback(async (email: string, password: string) => signInWithEmail(email, password), []);
  const signUpEmail = useCallback(async (email: string, password: string) => signUpWithEmail(email, password), []);
  const signInApple = useCallback(async () => signInWithApple(), []);
  const signInGoogle = useCallback(async () => signInWithGoogle(), []);

  const signOutUser = useCallback(async () => {
    await signOut();
  }, []);

  const deleteAccount = useCallback(async () => deleteCloudAccount(), []);

  const refreshSync = useCallback(async () => {
    const session = state.session ?? (await restoreAuthSession());
    if (session) await runSyncCycle(session);
  }, [state.session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      cloudEnabled,
      signInEmail,
      signUpEmail,
      signInApple,
      signInGoogle,
      signOutUser,
      deleteAccount,
      refreshSync,
    }),
    [state, cloudEnabled, signInEmail, signUpEmail, signInApple, signInGoogle, signOutUser, deleteAccount, refreshSync]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export type { User, Session };
