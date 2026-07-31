/**
 * @fileoverview In-memory auth session cache — avoids SecureStore round-trips on every local write.
 * @module cloud/auth/authSessionCache
 */
let cachedSession = null;
export function getCachedAuthSession() {
    return cachedSession;
}
export function setCachedAuthSession(session) {
    cachedSession = session;
}
export function clearCachedAuthSession() {
    cachedSession = null;
}
/** @internal Jest */
export function resetAuthSessionCacheForTests() {
    cachedSession = null;
}
