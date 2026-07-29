/**
 * @fileoverview SecureStore session adapter tests.
 */

import * as SecureStore from 'expo-secure-store';
import { logger } from '../../lib/security/logger';
import { supabaseSecureStorage } from './sessionStorage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../../lib/security/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

describe('supabaseSecureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs metadata when SecureStore read fails', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('keychain locked'));

    await expect(supabaseSecureStorage.getItem('supabase.auth.token')).resolves.toBeNull();

    expect(logger.warn).toHaveBeenCalledWith('auth.secureStore.read_failed', expect.objectContaining({ op: 'getItem' }));
  });

  it('logs metadata when SecureStore write fails', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('disk full'));

    await supabaseSecureStorage.setItem('supabase.auth.token', '{}');

    expect(logger.warn).toHaveBeenCalledWith('auth.secureStore.write_failed', expect.objectContaining({ op: 'setItem' }));
  });
});
