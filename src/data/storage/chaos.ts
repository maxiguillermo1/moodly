/**
 * @fileoverview Deterministic DEV/test chaos injection for storage operations.
 *
 * Purpose:
 * - Reproducible fault injection for AsyncStorage operations (failures + delays).
 * - Used only by the storage wrapper (single injection point).
 *
 * Enable (dev console / tests):
 *   globalThis.__MOODLY_CHAOS__ = {
 *     enabled: true,
 *     seed: 123,
 *     minDelayMs: 20,
 *     maxDelayMs: 80,
 *     pFail: 0.1,
 *     failNext: { getItem: 1, setItem: 0, removeItem: 0 },
 *   }
 *
 * IMPORTANT:
 * - Off by default.
 * - Never affects production builds.
 * - Deterministic when `seed` is set (including delay selection + probabilistic failures).
 * - Metadata-only logs. Never include values/payloads.
 */
import { logger } from '../../lib/security/logger';
import { perfProbe } from '../../perf';

export type StorageOp =
  | 'getItem'
  | 'setItem'
  | 'removeItem'
  | 'multiGet'
  | 'multiSet'
  | 'multiRemove';

type ChaosConfig = {
  enabled: boolean;
  seed?: number; // deterministic RNG seed (recommended)
  pFail?: number; // 0..1
  minDelayMs?: number; // >=0
  maxDelayMs?: number; // >= minDelayMs
  // Deterministic failure plan: fail the next N calls per op (decrementing counters).
  failNext?: Partial<Record<StorageOp, number>>;
  // Key-scoped deterministic failures: fail the next N calls for a specific op+key.
  // Example: { setItem: { "moodly.demoSeedVersion": 1 } }
  failNextByKey?: Partial<Record<StorageOp, Record<string, number>>>;
  // Optional allowlist (if provided, only these ops are affected).
  failOps?: Array<StorageOp>;
};

function cfg(): ChaosConfig | null {
  const dev = typeof __DEV__ !== 'undefined' && __DEV__;
  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  if (!dev && !isTest) return null;
  const c = (globalThis as any).__MOODLY_CHAOS__ as ChaosConfig | undefined;
  if (!c || !c.enabled) return null;
  return c;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Tiny deterministic RNG (LCG). Good enough for fault injection.
type RngState = { x: number };
function makeRng(seed: number): RngState {
  // Ensure uint32, avoid 0 which collapses some LCGs.
  const s = (seed >>> 0) || 1;
  return { x: s };
}
function rngNext01(rng: RngState): number {
  // Numerical Recipes LCG constants.
  rng.x = (rng.x * 1664525 + 1013904223) >>> 0;
  return rng.x / 0xffffffff;
}

let rngState: RngState | null = null;
const lastWarnAtByToken = new Map<string, number>();

function warnRateLimited(token: string, event: string, meta: Record<string, unknown>) {
  // Keep noise low: failures can be intentionally frequent in chaos configs.
  const now = Date.now();
  const last = lastWarnAtByToken.get(token) ?? 0;
  if (now - last < 750) return;
  lastWarnAtByToken.set(token, now);
  logger.warn(event as any, meta as any);
}

function getRng(seed: number | undefined): RngState {
  const s = typeof seed === 'number' && Number.isFinite(seed) ? seed : 1;
  if (!rngState) rngState = makeRng(s);
  return rngState;
}

export function __resetChaosForTests(): void {
  rngState = null;
  lastWarnAtByToken.clear();
}

export async function chaosBeforeStorageOp(op: StorageOp, key: string): Promise<void> {
  const c = cfg();
  if (!c) return;

  const failOps = c.failOps;
  if (Array.isArray(failOps) && failOps.length > 0 && !failOps.includes(op)) return;

  const minDelay = Math.max(0, Math.floor(c.minDelayMs ?? 0));
  const maxDelay = Math.max(minDelay, Math.floor(c.maxDelayMs ?? minDelay));
  const pFail = Math.min(1, Math.max(0, c.pFail ?? 0));
  const rng = getRng(c.seed);

  if (maxDelay > 0) {
    const delay =
      minDelay === maxDelay
        ? minDelay
        : minDelay + Math.floor(rngNext01(rng) * (maxDelay - minDelay + 1));
    if (delay > 0) await sleep(delay);
  }

  const failNext = c.failNext?.[op];
  const byKey = c.failNextByKey?.[op]?.[key];
  if (typeof byKey === 'number' && byKey > 0) {
    c.failNextByKey![op]![key] = byKey - 1;
    perfProbe.enabled && perfProbe.breadcrumb('storage.chaos.fail');
    warnRateLimited(`${op}:${key}`, 'storage.chaos.injectedFailure', { op, key, mode: 'failNextByKey' });
    throw new Error(`[chaos] injected ${op} failure`);
  }

  if (typeof failNext === 'number' && failNext > 0) {
    c.failNext![op] = failNext - 1;
    perfProbe.enabled && perfProbe.breadcrumb('storage.chaos.fail');
    warnRateLimited(`${op}:${key}`, 'storage.chaos.injectedFailure', { op, key, mode: 'failNext' });
    throw new Error(`[chaos] injected ${op} failure`);
  }

  if (pFail > 0 && rngNext01(rng) < pFail) {
    // Breadcrumb helps attribute hitches to chaos, not app code.
    perfProbe.enabled && perfProbe.breadcrumb('storage.chaos.fail');
    warnRateLimited(`${op}:${key}`, 'storage.chaos.injectedFailure', { op, key, mode: 'pFail' });
    throw new Error(`[chaos] injected ${op} failure`);
  }
}

