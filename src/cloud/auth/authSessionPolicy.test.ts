/**
 * @fileoverview Auth session policy unit tests.
 * @module cloud/auth/authSessionPolicy.test
 */

import {
  shouldBlockUiDuringRestore,
  shouldEnqueueFullLocalSnapshot,
  shouldRunCloudRestore,
} from './authSessionPolicy';

describe('authSessionPolicy', () => {
  it('runs cloud restore on sign-in and cold session only', () => {
    expect(shouldRunCloudRestore('SIGNED_IN')).toBe(true);
    expect(shouldRunCloudRestore('INITIAL_SESSION')).toBe(true);
    expect(shouldRunCloudRestore('TOKEN_REFRESHED')).toBe(false);
    expect(shouldRunCloudRestore('USER_UPDATED')).toBe(false);
    expect(shouldRunCloudRestore('SIGNED_OUT')).toBe(false);
  });

  it('enqueues full local snapshot only on fresh sign-in', () => {
    expect(shouldEnqueueFullLocalSnapshot('SIGNED_IN')).toBe(true);
    expect(shouldEnqueueFullLocalSnapshot('INITIAL_SESSION')).toBe(false);
    expect(shouldEnqueueFullLocalSnapshot('TOKEN_REFRESHED')).toBe(false);
  });

  it('blocks UI only during fresh sign-in restore', () => {
    expect(shouldBlockUiDuringRestore('SIGNED_IN')).toBe(true);
    expect(shouldBlockUiDuringRestore('INITIAL_SESSION')).toBe(false);
    expect(shouldBlockUiDuringRestore('TOKEN_REFRESHED')).toBe(false);
  });
});
