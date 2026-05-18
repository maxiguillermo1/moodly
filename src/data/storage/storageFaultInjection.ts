/**
 * @fileoverview Deterministic DEV/test fault injection at the AsyncStorage I/O boundary.
 *
 * Purpose:
 * - Reproducible failures and delays for storage operations.
 * - Single integration point (see `asyncStorage.ts`).
 *
 * Enable (dev console / tests), preferred:
 *   globalThis.__MOODLY_STORAGE_FAULTS__ = { enabled: true, seed: 123, ... }
 *
 * Legacy alias (still read):
 *   globalThis.__MOODLY_CHAOS__ = { enabled: true, seed: 123, ... }
 *
 * IMPORTANT:
 * - Off by default.
 * - Never affects production builds.
 * - Metadata-only logs. Never include values/payloads.
 */
import { logger } from '../../lib/security/logger';

export type StorageOp =
  | 'getItem'
  | 'setItem'
  | 'removeItem'
  | 'multiGet'
  | 'multiSet'
  | 'multiRemove'
  | 'getAllKeys';

type FaultInjectionConfig = {
  enabled: boolean;
  seed?: number;
  pFail?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  failNext?: Partial<Record<StorageOp, number>>;
  failNextByKey?: Partial<Record<StorageOp, Record<string, number>>>;
  failOps?: Array<StorageOp>;
};

function cfg(): FaultInjectionConfig | null {
  const dev = typeof __DEV__ !== 'undefined' && __DEV__;
  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  if (!dev && !isTest) return null;
  const g = globalThis as any;
  const c = (g.__MOODLY_STORAGE_FAULTS__ ?? g.__MOODLY_CHAOS__) as FaultInjectionConfig | undefined;
  if (!c || !c.enabled) return null;
  return c;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type RngState = { x: number };
function makeRng(seed: number): RngState {
  const s = (seed >>> 0) || 1;
  return { x: s };
}
function rngNext01(rng: RngState): number {
  rng.x = (rng.x * 1664525 + 1013904223) >>> 0;
  return rng.x / 0xffffffff;
}

let rngState: RngState | null = null;
const lastWarnAtByToken = new Map<string, number>();

function warnRateLimited(token: string, event: string, meta: Record<string, unknown>) {
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

export function __resetAsyncStorageFaultInjectionForTests(): void {
  rngState = null;
  lastWarnAtByToken.clear();
}

/** @deprecated Use {@link __resetAsyncStorageFaultInjectionForTests} */
export const __resetChaosForTests = __resetAsyncStorageFaultInjectionForTests;

export async function beforeAsyncStorageFaultInjection(op: StorageOp, key: string): Promise<void> {
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
    warnRateLimited(`${op}:${key}`, 'storage.faultInjection.failure', { op, key, mode: 'failNextByKey' });
    throw new Error(`[storageFaultInjection] injected ${op} failure`);
  }

  if (typeof failNext === 'number' && failNext > 0) {
    c.failNext![op] = failNext - 1;
    warnRateLimited(`${op}:${key}`, 'storage.faultInjection.failure', { op, key, mode: 'failNext' });
    throw new Error(`[storageFaultInjection] injected ${op} failure`);
  }

  if (pFail > 0 && rngNext01(rng) < pFail) {
    warnRateLimited(`${op}:${key}`, 'storage.faultInjection.failure', { op, key, mode: 'pFail' });
    throw new Error(`[storageFaultInjection] injected ${op} failure`);
  }
}

/** @deprecated Use {@link beforeAsyncStorageFaultInjection} */
export const chaosBeforeStorageOp = beforeAsyncStorageFaultInjection;
