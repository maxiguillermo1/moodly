/**
 * @fileoverview Auth session event policy for cloud restore triggers.
 * @module cloud/auth/authSessionPolicy
 */

import type { AuthChangeEvent } from './authService';

export function shouldRunCloudRestore(event: AuthChangeEvent): boolean {
  return event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
}

/** Full local snapshot upload only on fresh sign-in — not every cold resume. */
export function shouldEnqueueFullLocalSnapshot(event: AuthChangeEvent): boolean {
  return event === 'SIGNED_IN';
}

export function shouldBlockUiDuringRestore(_event: AuthChangeEvent): boolean {
  // Never block the local shell on network restore — sync runs in background.
  return false;
}
