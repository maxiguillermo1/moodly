/**
 * @fileoverview Coalesced cold-start priming (migrations + session RAM).
 * @module storage/prime
 */

import { ensureLocalPersistenceReady } from '../data/persistence/bootstrap';
import { warmSessionStore, logSessionStoreDiagnostics } from './warm';
import { logger } from '../security';

let criticalPromise: Promise<void> | null = null;
let warmPromise: Promise<void> | null = null;
let fullPrimePromise: Promise<void> | null = null;

/** Migrations only — required before first local read; must not warm full history. */
export function primeAppStorageCritical(): Promise<void> {
  if (criticalPromise) return criticalPromise;
  criticalPromise = ensureLocalPersistenceReady().catch((e) => {
    criticalPromise = null;
    logger.warn('session.critical.failed');
    throw e;
  });
  return criticalPromise;
}

/** Deferred RAM warm — safe after first interactive frame. */
export function warmAppStorageSession(): Promise<void> {
  if (warmPromise) return warmPromise;
  const p: any = (globalThis as any).performance;
  const start = typeof p?.now === 'function' ? p.now() : Date.now();
  warmPromise = (async () => {
    await primeAppStorageCritical();
    await warmSessionStore();
    const end = typeof p?.now === 'function' ? p.now() : Date.now();
    const durationMs = Number(((end as number) - (start as number)).toFixed(1));
    logger.perf('session.warm', { phase: 'deferred', source: 'storage', durationMs });
    logSessionStoreDiagnostics({ totalMs: durationMs });
  })().catch((e) => {
    warmPromise = null;
    logger.warn('session.warm.failed');
    throw e;
  });
  return warmPromise;
}

/** Run migrations + warm mood/settings RAM once per session (coalesced). */
export function primeAppStorage(): Promise<void> {
  if (fullPrimePromise) return fullPrimePromise;
  fullPrimePromise = warmAppStorageSession();
  return fullPrimePromise;
}
