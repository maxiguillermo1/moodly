/**
 * @fileoverview Legacy dev hook: synthetic data is **opt-in** only.
 *
 * The app no longer auto-fills moods/goals/todos on launch. To install the bundled
 * simulation for QA, use Metro: `await globalThis.KairoSeed.rebuild()` or
 * {@link fullDemoSeed.runFullDemoRebuild} from the session repository.
 */

/**
 * Intentionally a no-op. Keeps the export stable for older imports and tests.
 */
export async function seedDemoEntriesIfEmpty(): Promise<void> {
  return Promise.resolve();
}
