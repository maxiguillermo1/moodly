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
export { PerfMarks } from './marks';
export * from './marks';
export {
  navigationMetrics,
  recordTabPress,
  recordTabPressReceived,
  recordNavDispatch,
  recordNavReady,
  recordNavStateChange,
  recordScreenFocused,
} from './navigationMetrics';

export function initPerfProbe(): void {
  perfProbe.init();
}
