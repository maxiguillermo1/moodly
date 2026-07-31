/**
 * @fileoverview authSessionCache unit tests.
 */
import { clearCachedAuthSession, getCachedAuthSession, resetAuthSessionCacheForTests, setCachedAuthSession, } from './authSessionCache';
describe('authSessionCache', () => {
    beforeEach(() => {
        resetAuthSessionCacheForTests();
    });
    it('stores and returns session by reference', () => {
        const session = { user: { id: 'u1' } };
        setCachedAuthSession(session);
        expect(getCachedAuthSession()).toBe(session);
    });
    it('clears cached session', () => {
        setCachedAuthSession({ user: { id: 'u1' } });
        clearCachedAuthSession();
        expect(getCachedAuthSession()).toBeNull();
    });
});
