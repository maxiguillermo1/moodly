/**
 * @fileoverview Dev-only deterministic debug scenarios runner.
 *
 * No UI changes: scenarios are triggered via dev console.
 *
 * Usage (Metro console):
 *   globalThis.KairoDebug.list()
 *   globalThis.KairoDebug.run('rapidMonthTaps')
 *
 * Notes:
 * - Scenarios are deterministic and log PASS/FAIL via the structured logger.
 * - Scenarios never log sensitive payloads.
 */
import { logger } from '../lib/security/logger';
import { createFrameCoalescer, isLatestRequest, nextRequestId } from '../utils';
import { upsertEntry, getAllEntries, getSettings } from '../storage';
function sleepFrame() {
    return new Promise((r) => requestAnimationFrame(() => r()));
}
function pass(name, meta) {
    logger.dev('debug.scenario.pass', { name, ...(meta ?? {}) });
}
function fail(name, error, meta) {
    logger.warn('debug.scenario.fail', { name, error, ...(meta ?? {}) });
}
/** Compile-time exhaustiveness guard for {@link DebugScenarioName} branches. */
function assertNever(_x) { }
export function listDebugScenarios() {
    return ['rapidTapMomentum', 'rapidMonthTaps', 'backgroundDuringSave', 'storageChaosPlan'];
}
export async function runDebugScenario(name) {
    try {
        if (name === 'rapidMonthTaps') {
            // Pure navigation gate test: last enqueued wins; one commit per frame.
            const committed = [];
            const c = createFrameCoalescer((v) => committed.push(v));
            for (let i = 0; i < 20; i++)
                c.enqueue({ y: 2026, m: i % 12 });
            await sleepFrame();
            await sleepFrame();
            if (committed.length !== 1)
                throw new Error(`Expected 1 commit, got ${committed.length}`);
            if (committed[0].m !== 19 % 12)
                throw new Error(`Expected last month ${(19 % 12)}, got ${committed[0].m}`);
            pass(name, { commits: committed.length, last: committed[0] });
            return;
        }
        if (name === 'rapidTapMomentum') {
            // Latest-only semantics: older async completion must not be treated as current.
            const ref = { current: 0 };
            const a = nextRequestId(ref);
            const b = nextRequestId(ref);
            if (isLatestRequest(ref, a))
                throw new Error('Unexpected: older request considered latest');
            if (!isLatestRequest(ref, b))
                throw new Error('Unexpected: latest request not considered latest');
            pass(name, { a, b });
            return;
        }
        if (name === 'backgroundDuringSave') {
            // Best-effort: we can't programmatically drive AppState in a running app without UI tooling,
            // but we can at least exercise the write path under deterministic delay and ensure completion.
            globalThis.__KAIRO_CHAOS__ = { enabled: true, seed: 42, minDelayMs: 25, maxDelayMs: 25, pFail: 0, failOps: ['setItem'] };
            await upsertEntry({ date: '2026-02-09', mood: 'A', note: '', createdAt: Date.now(), updatedAt: Date.now() });
            globalThis.__KAIRO_CHAOS__ = undefined;
            const all = await getAllEntries();
            if (!all['2026-02-09'])
                throw new Error('Entry missing after delayed save');
            pass(name, { ok: true });
            return;
        }
        if (name === 'storageChaosPlan') {
            // Smoke test for deterministic chaos config + safe defaults.
            globalThis.__KAIRO_CHAOS__ = {
                enabled: true,
                seed: 1,
                failNext: { getItem: 1 },
            };
            const s = await getSettings(); // should return defaults even if injected getItem fails
            globalThis.__KAIRO_CHAOS__ = undefined;
            if (!s || s.calendarMoodStyle == null)
                throw new Error('Settings missing');
            pass(name, { calendarMoodStyle: s.calendarMoodStyle });
            return;
        }
        assertNever(name);
    }
    catch (e) {
        fail(name, e);
    }
}
export async function runAllDebugScenarios() {
    for (const name of listDebugScenarios()) {
        // Run sequentially to keep logs readable and deterministic.
        await runDebugScenario(name);
    }
}
