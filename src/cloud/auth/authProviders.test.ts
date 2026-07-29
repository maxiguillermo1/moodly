/**
 * @fileoverview Auth provider availability cache tests.
 */

import {
  fetchAuthProviderAvailability,
  resetAuthProviderAvailabilityCacheForTests,
} from './authProviders';

jest.mock('../config', () => ({
  getSupabaseConfig: () => ({
    url: 'https://example.supabase.co',
    anonKey: 'anon-key',
    enabled: true,
  }),
}));

describe('authProviders', () => {
  beforeEach(() => {
    resetAuthProviderAvailabilityCacheForTests();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ external: { apple: true, google: true } }),
    }) as unknown as typeof fetch;
  });

  it('dedupes concurrent fetches and caches the result', async () => {
    const [first, second, third] = await Promise.all([
      fetchAuthProviderAvailability(),
      fetchAuthProviderAvailability(),
      fetchAuthProviderAvailability(),
    ]);

    expect(first).toEqual({ apple: true, google: true });
    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const cached = await fetchAuthProviderAvailability();
    expect(cached).toEqual(first);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('bypasses cache when requested', async () => {
    await fetchAuthProviderAvailability();
    await fetchAuthProviderAvailability({ bypassCache: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
