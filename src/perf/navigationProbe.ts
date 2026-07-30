/**
 * NavigationContainer-level probes (dev-only).
 *
 * We attach these at the container to:
 * - measure "app start -> nav ready"
 * - detect route changes (best-effort)
 *
 * IMPORTANT:
 * - We do not mutate navigation state.
 * - We only log metadata-only perf events.
 */

import { createNavigationContainerRef } from '@react-navigation/native';

import { recordNavReady, recordNavStateChange } from './navigationMetrics';

export const navigationRef = createNavigationContainerRef();

export const perfNavigation = {
  ref: navigationRef,
  onReady(): void {
    recordNavReady();
  },
  onStateChange(): void {
    const state = navigationRef.getRootState?.();
    recordNavStateChange(state);
  },
};
