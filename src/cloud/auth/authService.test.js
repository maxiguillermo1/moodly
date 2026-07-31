/**
 * @fileoverview Unit tests for Apple / Google auth service routing.
 * @module cloud/auth/authService.test
 */
const mockSignInWithIdToken = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockSignUp = jest.fn();
const mockAppleSignIn = jest.fn();
const mockIsAppleAvailable = jest.fn();
const mockOpenAuthSession = jest.fn();
jest.mock('expo-apple-authentication', () => ({
    isAvailableAsync: (...args) => mockIsAppleAvailable(...args),
    signInAsync: (...args) => mockAppleSignIn(...args),
    AppleAuthenticationScope: {
        FULL_NAME: 0,
        EMAIL: 1,
    },
}));
jest.mock('expo-crypto', () => ({
    randomUUID: () => 'raw-nonce-uuid',
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    CryptoEncoding: { HEX: 'hex' },
    digestStringAsync: async () => 'hashed-nonce',
}));
jest.mock('expo-web-browser', () => ({
    maybeCompleteAuthSession: jest.fn(),
    openAuthSessionAsync: (...args) => mockOpenAuthSession(...args),
}));
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));
jest.mock('../supabase/sessionStorage', () => ({
    clearSupabaseSessionStorage: jest.fn(),
}));
jest.mock('./oauthCallback', () => ({
    createSessionFromOAuthCallbackUrl: jest.fn(),
}));
jest.mock('../supabase/client', () => ({
    getSupabaseClient: () => ({
        auth: {
            signInWithIdToken: mockSignInWithIdToken,
            signInWithOAuth: mockSignInWithOAuth,
            signUp: mockSignUp,
            updateUser: jest.fn().mockResolvedValue({}),
        },
    }),
    isSupabaseConfigured: () => true,
}));
jest.mock('../config', () => ({
    getSupabaseConfig: () => ({ enabled: true, url: 'https://test.supabase.co', anonKey: 'anon' }),
    getAuthRedirectUri: () => 'kairo://auth/callback',
}));
jest.mock('react-native', () => ({
    Platform: { OS: 'ios' },
}));
import { signInWithApple, signUpWithEmail, signInWithGoogle, resetAuthServiceSessionStateForTests } from './authService';
describe('signInWithApple', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetAuthServiceSessionStateForTests();
        mockIsAppleAvailable.mockResolvedValue(true);
        mockAppleSignIn.mockResolvedValue({
            identityToken: 'apple-id-token',
            fullName: { givenName: 'Test', familyName: 'User' },
        });
        mockSignInWithIdToken.mockResolvedValue({ error: null });
    });
    it('uses native Apple flow on iOS with hashed nonce', async () => {
        const result = await signInWithApple();
        expect(result).toEqual({ ok: true });
        expect(mockAppleSignIn).toHaveBeenCalledWith(expect.objectContaining({
            nonce: 'hashed-nonce',
            requestedScopes: expect.any(Array),
        }));
        expect(mockSignInWithIdToken).toHaveBeenCalledWith({
            provider: 'apple',
            token: 'apple-id-token',
            nonce: 'raw-nonce-uuid',
        });
        expect(mockSignInWithOAuth).not.toHaveBeenCalled();
    });
    it('returns cancel message when user dismisses Apple sheet', async () => {
        mockAppleSignIn.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });
        const result = await signInWithApple();
        expect(result).toEqual({ ok: false, message: 'Sign in cancelled.' });
    });
    it('surfaces Supabase id-token errors', async () => {
        mockSignInWithIdToken.mockResolvedValue({ error: { message: 'Invalid JWT' } });
        const result = await signInWithApple();
        expect(result).toEqual({ ok: false, message: 'Invalid JWT' });
    });
});
describe('signUpWithEmail', () => {
    beforeEach(() => {
        resetAuthServiceSessionStateForTests();
        mockSignUp.mockReset();
    });
    it('prompts for email confirmation when sign-up returns no session', async () => {
        mockSignUp.mockResolvedValue({ data: { session: null }, error: null });
        const result = await signUpWithEmail('test@example.com', 'secret12');
        expect(result).toEqual({
            ok: false,
            message: 'Check your email to confirm your account, then sign in.',
        });
    });
});
describe('signInWithGoogle', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetAuthServiceSessionStateForTests();
        mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://oauth.test/start' }, error: null });
        mockOpenAuthSession.mockResolvedValue({ type: 'cancel' });
    });
    it('returns cancel when the browser session is dismissed', async () => {
        const result = await signInWithGoogle();
        expect(result).toEqual({ ok: false, message: 'Sign in cancelled.' });
    });
});
