/**
 * @fileoverview Unit tests for OAuth callback URL parsing.
 * @module cloud/auth/oauthCallback.test
 */

import { parseOAuthCallbackUrl } from './oauthCallback';

describe('parseOAuthCallbackUrl', () => {
  it('reads authorization code from query string', () => {
    const params = parseOAuthCallbackUrl('kairo://auth/callback?code=abc123');
    expect(params.code).toBe('abc123');
    expect(params.error).toBeUndefined();
  });

  it('reads tokens from hash fragment', () => {
    const params = parseOAuthCallbackUrl(
      'kairo://auth/callback#access_token=at&refresh_token=rt'
    );
    expect(params.accessToken).toBe('at');
    expect(params.refreshToken).toBe('rt');
  });

  it('reads OAuth error from callback', () => {
    const params = parseOAuthCallbackUrl(
      'kairo://auth/callback?error=access_denied&error_description=User%20denied'
    );
    expect(params.error).toBe('access_denied');
    expect(params.errorDescription).toBe('User denied');
  });
});
