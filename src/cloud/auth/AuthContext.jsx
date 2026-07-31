import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @fileoverview Kairo cloud auth React context.
 * @module cloud/auth/AuthContext
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { logger } from '../../lib/security/logger';
import { isSupabaseConfigured } from '../supabase/client';
import { deleteCloudAccount, onAuthStateChange, signInWithApple, signInWithEmail, signInWithGoogle, signOut, signUpWithEmail, } from './authService';
import { shouldBlockUiDuringRestore, shouldEnqueueFullLocalSnapshot, shouldRunCloudRestore, } from './authSessionPolicy';
import { runSyncCycle, onUserSignedOut } from '../sync/syncEngine';
import { runFreshSignInFlow } from './freshSignInFlow';
import { setCachedAuthSession } from './authSessionCache';
import { registerKairoCloudPullApplier } from '../../data/sync/cloudPullApplier';
import { clearLocalUserDataOnLogout } from '../../data/sync/cloudLogout';
import { setSyncStatus } from '../sync/syncStatusStore';
import { getSettings, peekSettingsCache, setLocalOnlyMode } from '../../data/storage/settingsStorage';
import { primeAppStorage } from '../../storage/prime';
const AuthContext = createContext(null);
async function handleFreshSignIn(session) {
    await runFreshSignInFlow(session);
}
async function handleSessionResume(session) {
    await registerKairoCloudPullApplier();
    await runSyncCycle(session);
}
async function handleSignedOut() {
    await onUserSignedOut();
    await clearLocalUserDataOnLogout();
}
export function AuthProvider({ children }) {
    const cloudEnabled = isSupabaseConfigured();
    const [localOnlyMode, setLocalOnlyModeState] = useState(() => peekSettingsCache()?.localOnlyMode === true);
    const [settingsLoaded, setSettingsLoaded] = useState(() => !cloudEnabled || peekSettingsCache() !== null);
    const [state, setState] = useState({
        initialized: !cloudEnabled,
        restoring: false,
        session: null,
        user: null,
    });
    const hadSessionRef = useRef(false);
    const restoredUserIdRef = useRef(null);
    const activeUserIdRef = useRef(null);
    const sessionRef = useRef(null);
    const localOnlyModeRef = useRef(false);
    useEffect(() => {
        localOnlyModeRef.current = localOnlyMode;
    }, [localOnlyMode]);
    useEffect(() => {
        if (!cloudEnabled)
            return;
        let mounted = true;
        void primeAppStorage()
            .then(() => getSettings())
            .then((settings) => {
            if (!mounted)
                return;
            setLocalOnlyModeState(settings.localOnlyMode === true);
            setSettingsLoaded(true);
        })
            .catch(() => {
            if (!mounted)
                return;
            setSettingsLoaded(true);
        });
        return () => {
            mounted = false;
        };
    }, [cloudEnabled]);
    const continueOffline = useCallback(async () => {
        await setLocalOnlyMode(true);
        setLocalOnlyModeState(true);
    }, []);
    useEffect(() => {
        if (!cloudEnabled)
            return;
        let mounted = true;
        const runRestoreForSession = async (session, event, blockUi) => {
            const userId = session.user.id;
            if (restoredUserIdRef.current === userId)
                return;
            if (blockUi && mounted) {
                setState((prev) => ({ ...prev, restoring: true }));
            }
            try {
                if (shouldEnqueueFullLocalSnapshot(event)) {
                    await handleFreshSignIn(session);
                }
                else {
                    await handleSessionResume(session);
                }
                restoredUserIdRef.current = userId;
            }
            catch (e) {
                logger.warn('auth.cloudRestore.failed', { error: e });
                setSyncStatus('offline', 'Signed in, but sync failed. Try again from Account.');
            }
            finally {
                if (blockUi && mounted) {
                    setState((prev) => ({ ...prev, restoring: false }));
                }
            }
        };
        const handleAuthEvent = async (event, session) => {
            if (!mounted)
                return;
            sessionRef.current = session;
            setCachedAuthSession(session);
            const wasSignedIn = hadSessionRef.current;
            setState((prev) => {
                const nextUserId = session?.user?.id ?? null;
                const prevUserId = prev.user?.id ?? null;
                if (event === 'TOKEN_REFRESHED' && nextUserId === prevUserId && nextUserId !== null) {
                    return prev;
                }
                return {
                    ...prev,
                    initialized: true,
                    session,
                    user: session?.user ?? null,
                };
            });
            if (session) {
                const nextUserId = session.user.id;
                const prevUserId = activeUserIdRef.current;
                if (prevUserId && prevUserId !== nextUserId) {
                    restoredUserIdRef.current = null;
                    try {
                        await handleSignedOut();
                    }
                    catch (e) {
                        logger.warn('auth.accountSwitch.cleanup.failed', { error: e });
                    }
                }
                activeUserIdRef.current = nextUserId;
                hadSessionRef.current = true;
                if (localOnlyModeRef.current) {
                    void setLocalOnlyMode(false).then(() => {
                        if (mounted)
                            setLocalOnlyModeState(false);
                    });
                }
                if (shouldRunCloudRestore(event)) {
                    const blockUi = shouldBlockUiDuringRestore(event);
                    await runRestoreForSession(session, event, blockUi);
                }
                return;
            }
            if (wasSignedIn) {
                hadSessionRef.current = false;
                activeUserIdRef.current = null;
                restoredUserIdRef.current = null;
                sessionRef.current = null;
                setCachedAuthSession(null);
                setState((prev) => ({ ...prev, restoring: false }));
                try {
                    await handleSignedOut();
                }
                catch (e) {
                    logger.warn('auth.signOutCleanup.failed', { error: e });
                }
            }
        };
        const unsubscribe = onAuthStateChange((event, session) => {
            void handleAuthEvent(event, session);
        });
        return () => {
            mounted = false;
            unsubscribe();
        };
    }, [cloudEnabled]);
    const signInEmail = useCallback(async (email, password) => signInWithEmail(email, password), []);
    const signUpEmail = useCallback(async (email, password) => signUpWithEmail(email, password), []);
    const signInApple = useCallback(async () => signInWithApple(), []);
    const signInGoogle = useCallback(async () => signInWithGoogle(), []);
    const signOutUser = useCallback(async () => {
        try {
            await signOut();
            await handleSignedOut();
        }
        catch (e) {
            logger.warn('auth.signOut.failed', { error: e });
            throw e;
        }
    }, []);
    const deleteAccount = useCallback(async () => deleteCloudAccount(), []);
    const refreshSync = useCallback(async () => {
        const session = sessionRef.current;
        if (session)
            await runSyncCycle(session);
    }, []);
    const value = useMemo(() => ({
        ...state,
        cloudEnabled,
        localOnlyMode,
        settingsLoaded,
        continueOffline,
        signInEmail,
        signUpEmail,
        signInApple,
        signInGoogle,
        signOutUser,
        deleteAccount,
        refreshSync,
    }), [state, cloudEnabled, localOnlyMode, settingsLoaded, continueOffline, signInEmail, signUpEmail, signInApple, signInGoogle, signOutUser, deleteAccount, refreshSync]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return ctx;
}
