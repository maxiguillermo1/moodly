/**
 * @fileoverview Hook for Supabase social auth provider availability.
 * @module hooks/useAuthProviders
 */

import { useEffect, useState } from 'react';
import {
  fetchAuthProviderAvailability,
  type AuthProviderAvailability,
} from '../cloud/auth/authProviders';
import { isSupabaseConfigured } from '../cloud/supabase/client';

export function useAuthProviders(): AuthProviderAvailability & { loaded: boolean } {
  const cloudEnabled = isSupabaseConfigured();
  const [state, setState] = useState<AuthProviderAvailability & { loaded: boolean }>({
    apple: false,
    google: false,
    loaded: !cloudEnabled,
  });

  useEffect(() => {
    if (!cloudEnabled) return;
    let mounted = true;
    void fetchAuthProviderAvailability().then((availability) => {
      if (!mounted) return;
      setState({ ...availability, loaded: true });
    });
    return () => {
      mounted = false;
    };
  }, [cloudEnabled]);

  return state;
}
