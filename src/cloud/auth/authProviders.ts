/**
 * @fileoverview Discover which Supabase Auth social providers are enabled.
 * @module cloud/auth/authProviders
 */

import { getSupabaseConfig } from '../config';

export type AuthProviderAvailability = {
  apple: boolean;
  google: boolean;
};

const DEFAULT: AuthProviderAvailability = { apple: false, google: false };

let cachedAvailability: AuthProviderAvailability | null = null;
let inflightFetch: Promise<AuthProviderAvailability> | null = null;

async function fetchAuthProviderAvailabilityUncached(): Promise<AuthProviderAvailability> {
  const { url, anonKey, enabled } = getSupabaseConfig();
  if (!enabled) return DEFAULT;

  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (!res.ok) return DEFAULT;
    const data = (await res.json()) as { external?: { apple?: boolean; google?: boolean } };
    return {
      apple: Boolean(data.external?.apple),
      google: Boolean(data.external?.google),
    };
  } catch {
    return DEFAULT;
  }
}

/** Public auth settings expose which external providers are enabled (no secret required). */
export async function fetchAuthProviderAvailability(options?: {
  bypassCache?: boolean;
}): Promise<AuthProviderAvailability> {
  if (!options?.bypassCache && cachedAvailability) return cachedAvailability;
  if (inflightFetch) return inflightFetch;

  inflightFetch = fetchAuthProviderAvailabilityUncached()
    .then((result) => {
      cachedAvailability = result;
      return result;
    })
    .finally(() => {
      inflightFetch = null;
    });

  return inflightFetch;
}

/** @internal Jest */
export function resetAuthProviderAvailabilityCacheForTests(): void {
  cachedAvailability = null;
  inflightFetch = null;
}
