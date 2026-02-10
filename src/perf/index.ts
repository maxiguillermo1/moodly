/**
 * Public perf facade (dev-only probes).
 *
 * Screens may import from here without violating architecture boundaries.
 */

import { perfProbe } from './probe';
export { perfProbe } from './probe';
export { perfNavigation } from './navigationProbe';
export { PerfProfiler } from './PerfProfiler';
export { usePerfScreen } from './usePerfScreen';

export function initPerfProbe(): void {
  // Keep init centralized so App.tsx can call it once very early.
  // Safe: dev-only, metadata-only logs.
  // NOTE: This is a direct import (no dynamic require) to avoid lint issues.
  // This module remains dev-only by guarding at runtime inside `perfProbe.init()`.
  perfProbe.init();
}

