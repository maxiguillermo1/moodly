/**
 * @fileoverview Session warmup + dev seed entrypoints.
 * @module data/repositories/sessionRepository
 */

import * as demoSeed from '../storage/demoSeed';
import * as fullDemoSeed from '../storage/fullDemoSeed';
import * as sessionStore from '../storage/sessionStore';

export * from '../storage/sessionStore';
export * from '../storage/demoSeed';
export * from '../storage/fullDemoSeed';

export const sessionRepository = {
  warmSessionStore: sessionStore.warmSessionStore,
  logSessionStoreDiagnostics: sessionStore.logSessionStoreDiagnostics,
  /** @deprecated No-op; use `rebuildFullDemoDataset` when you explicitly want synthetic data. */
  seedDemoEntriesIfEmpty: demoSeed.seedDemoEntriesIfEmpty,
  /** Opt-in: install/refresh bundled synthetic dataset (same as `MoodlySeed.rebuild()` in dev). */
  ensureDevFullDemoDatasetCurrent: fullDemoSeed.ensureDevFullDemoDatasetCurrent,
  rebuildFullDemoDataset: fullDemoSeed.runFullDemoRebuild,
} as const;

export type ISessionRepository = typeof sessionRepository;
