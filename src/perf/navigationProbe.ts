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

import { perfProbe } from './probe';

export const navigationRef = createNavigationContainerRef();

export const perfNavigation = {
  ref: navigationRef,
  onReady(): void {
    perfProbe.onNavReady();
  },
  onStateChange(): void {
    // When called from NavigationContainer, state is accessible via ref.
    if (!perfProbe.enabled) return;
    const state = navigationRef.getRootState?.();
    perfProbe.onNavStateChange(state);
  },
};

