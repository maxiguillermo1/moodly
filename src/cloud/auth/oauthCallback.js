/**
 * @fileoverview Parse OAuth redirect URLs and exchange for Supabase session.
 * @module cloud/auth/oauthCallback
 */
import * as Linking from 'expo-linking';
/** Extract OAuth params from deep-link callback (query or hash). */
export function parseOAuthCallbackUrl(url) {
    const parsed = Linking.parse(url);
    const fromQuery = parsed.queryParams ?? {};
    let code = typeof fromQuery.code === 'string' ? fromQuery.code : undefined;
    let accessToken = typeof fromQuery.access_token === 'string' ? fromQuery.access_token : undefined;
    let refreshToken = typeof fromQuery.refresh_token === 'string' ? fromQuery.refresh_token : undefined;
    let error = typeof fromQuery.error === 'string' ? fromQuery.error : undefined;
    let errorDescription = typeof fromQuery.error_description === 'string' ? fromQuery.error_description : undefined;
    const hashIdx = url.indexOf('#');
    if (hashIdx >= 0) {
        const hashParams = new URLSearchParams(url.slice(hashIdx + 1));
        code = code ?? hashParams.get('code') ?? undefined;
        accessToken = accessToken ?? hashParams.get('access_token') ?? undefined;
        refreshToken = refreshToken ?? hashParams.get('refresh_token') ?? undefined;
        error = error ?? hashParams.get('error') ?? undefined;
        errorDescription = errorDescription ?? hashParams.get('error_description') ?? undefined;
    }
    return { code, accessToken, refreshToken, error, errorDescription };
}
/** Exchange OAuth callback URL for a persisted Supabase session. */
export async function createSessionFromOAuthCallbackUrl(client, url) {
    const params = parseOAuthCallbackUrl(url);
    if (params.error) {
        return {
            ok: false,
            message: params.errorDescription ?? params.error,
        };
    }
    if (params.code) {
        const { error } = await client.auth.exchangeCodeForSession(params.code);
        if (error)
            return { ok: false, message: error.message };
        return { ok: true };
    }
    if (params.accessToken) {
        const { error } = await client.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken ?? '',
        });
        if (error)
            return { ok: false, message: error.message };
        return { ok: true };
    }
    return { ok: false, message: 'OAuth callback missing authorization code.' };
}
