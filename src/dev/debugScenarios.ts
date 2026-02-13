/**
 * @fileoverview Dev-only deterministic debug scenarios runner.
 *
 * No UI changes: scenarios are triggered via dev console.
 *
 * Usage (Metro console):
 *   globalThis.MoodlyDebug.list()
 *   globalThis.MoodlyDebug.run('rapidMonthTaps')
 *
 * Notes:
 * - Scenarios are deterministic and log PASS/FAIL via the structured logger.
 * - Scenarios never log sensitive payloads.
 */
import { logger } from '../lib/security/logger';
import { createFrameCoalescer, isLatestRequest, nextRequestId } from '../utils';
import { upsertEntry, getAllEntries, getSettings } from '../storage';

export type DebugScenarioName =
  | 'rapidTapMomentum'
  | 'rapidMonthTaps'
  | 'backgroundDuringSave'
  | 'storageChaosPlan';

function sleepFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

function pass(name: DebugScenarioName, meta?: Record<string, unknown>) {
  logger.dev('debug.scenario.pass', { name, ...(meta ?? {}) });
}
function fail(name: DebugScenarioName, error: unknown, meta?: Record<string, unknown>) {
  logger.warn('debug.scenario.fail', { name, error, ...(meta ?? {}) });
}

export function listDebugScenarios(): DebugScenarioName[] {
  return ['rapidTapMomentum', 'rapidMonthTaps', 'backgroundDuringSave', 'storageChaosPlan'];
}

export async function runDebugScenario(name: DebugScenarioName): Promise<void> {
  try {
    if (name === 'rapidMonthTaps') {
      // Pure navigation gate test: last enqueued wins; one commit per frame.
      const committed: Array<{ y: number; m: number }> = [];
      const c = createFrameCoalescer<{ y: number; m: number }>((v) => committed.push(v));
      for (let i = 0; i < 20; i++) c.enqueue({ y: 2026, m: i % 12 });
      await sleepFrame();
      await sleepFrame();
      if (committed.length !== 1) throw new Error(`Expected 1 commit, got ${committed.length}`);
      if (committed[0]!.m !== 19 % 12) throw new Error(`Expected last month ${(19 % 12)}, got ${committed[0]!.m}`);
      pass(name, { commits: committed.length, last: committed[0] });
      return;
    }

    if (name === 'rapidTapMomentum') {
      // Latest-only semantics: older async completion must not be treated as current.
      const ref = { current: 0 };
      const a = nextRequestId(ref as any);
      const b = nextRequestId(ref as any);
      if (isLatestRequest(ref as any, a)) throw new Error('Unexpected: older request considered latest');
      if (!isLatestRequest(ref as any, b)) throw new Error('Unexpected: latest request not considered latest');
      pass(name, { a, b });
      return;
    }

    if (name === 'backgroundDuringSave') {
      // Best-effort: we can't programmatically drive AppState in a running app without UI tooling,
      // but we can at least exercise the write path under deterministic delay and ensure completion.
      (globalThis as any).__MOODLY_CHAOS__ = { enabled: true, seed: 42, minDelayMs: 25, maxDelayMs: 25, pFail: 0, failOps: ['setItem'] };
      await upsertEntry({ date: '2026-02-09', mood: 'A', note: '', createdAt: Date.now(), updatedAt: Date.now() });
      (globalThis as any).__MOODLY_CHAOS__ = undefined;
      const all = await getAllEntries();
      if (!all['2026-02-09']) throw new Error('Entry missing after delayed save');
      pass(name, { ok: true });
      return;
    }

    if (name === 'storageChaosPlan') {
      // Smoke test for deterministic chaos config + safe defaults.
      (globalThis as any).__MOODLY_CHAOS__ = {
        enabled: true,
        seed: 1,
        failNext: { getItem: 1 },
      };
      const s = await getSettings(); // should return defaults even if injected getItem fails
      (globalThis as any).__MOODLY_CHAOS__ = undefined;
      if (!s || (s as any).calendarMoodStyle == null) throw new Error('Settings missing');
      pass(name, { calendarMoodStyle: s.calendarMoodStyle });
      return;
    }

    // Exhaustive check
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _exhaustive: never = name;
  } catch (e) {
    fail(name, e);
  }
}

export async function runAllDebugScenarios(): Promise<void> {
  for (const name of listDebugScenarios()) {
    // Run sequentially to keep logs readable and deterministic.
    await runDebugScenario(name);
  }
}

