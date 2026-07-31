/**
 * @fileoverview Coalesced cold-start priming (migrations + session RAM).
 * @module storage/prime
 */
import { ensureLocalPersistenceReady } from '../data/persistence/bootstrap';
import { warmSessionStore, logSessionStoreDiagnostics } from './warm';
import { logger } from '../security';
let primePromise = null;
/** Run migrations + warm mood/settings RAM once per session (coalesced). */
export function primeAppStorage() {
    if (primePromise)
        return primePromise;
    const p = globalThis.performance;
    const start = typeof p?.now === 'function' ? p.now() : Date.now();
    primePromise = (async () => {
        await ensureLocalPersistenceReady();
        await warmSessionStore();
        const end = typeof p?.now === 'function' ? p.now() : Date.now();
        const durationMs = Number((end - start).toFixed(1));
        logger.perf('session.warm', { phase: 'cold', source: 'storage', durationMs });
        logSessionStoreDiagnostics({ totalMs: durationMs });
    })().catch((e) => {
        primePromise = null;
        logger.warn('session.warm.failed');
        throw e;
    });
    return primePromise;
}
