/**
 * @fileoverview Coalesced cold-start priming (migrations + session RAM).
 * @module storage/prime
 */

import { ensureLocalPersistenceReady } from '../data/persistence/bootstrap';
import { warmSessionStore, logSessionStoreDiagnostics } from './warm';
import { logger } from '../security';

let primePromise: Promise<void> | null = null;

/** Run migrations + warm mood/settings RAM once per session (coalesced). */
export function primeAppStorage(): Promise<void> {
  if (primePromise) return primePromise;
  const p: any = (globalThis as any).performance;
  const start = typeof p?.now === 'function' ? p.now() : Date.now();
  primePromise = (async () => {
    await ensureLocalPersistenceReady();
    await warmSessionStore();
    const end = typeof p?.now === 'function' ? p.now() : Date.now();
    const durationMs = Number(((end as number) - (start as number)).toFixed(1));
    logger.perf('session.warm', { phase: 'cold', source: 'storage', durationMs });
    logSessionStoreDiagnostics({ totalMs: durationMs });
  })().catch((e) => {
    primePromise = null;
    logger.warn('session.warm.failed');
    throw e;
  });
  return primePromise;
}
