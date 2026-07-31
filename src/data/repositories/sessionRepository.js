/**
 * @fileoverview Session warmup + dev seed entrypoints.
 * @module data/repositories/sessionRepository
 */
import * as demoSeed from '../storage/demoSeed';
import * as sessionStore from '../storage/sessionStore';
export * from '../storage/sessionStore';
export * from '../storage/demoSeed';
export const sessionRepository = {
    warmSessionStore: sessionStore.warmSessionStore,
    logSessionStoreDiagnostics: sessionStore.logSessionStoreDiagnostics,
    /** @deprecated No-op; use `rebuildFullDemoDataset` when you explicitly want synthetic data. */
    seedDemoEntriesIfEmpty: demoSeed.seedDemoEntriesIfEmpty,
    /** Opt-in: install/refresh bundled synthetic dataset (same as `KairoSeed.rebuild()` in dev). */
    async ensureDevFullDemoDatasetCurrent() {
        const { ensureDevFullDemoDatasetCurrent } = await import('../storage/fullDemoSeed');
        return ensureDevFullDemoDatasetCurrent();
    },
    /** Opt-in dev rebuild (lazy-loaded; keeps ~850 LOC seed out of cold Metro graph). */
    async rebuildFullDemoDataset() {
        const { runFullDemoRebuild } = await import('../storage/fullDemoSeed');
        return runFullDemoRebuild();
    },
};
