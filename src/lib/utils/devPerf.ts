/**
 * @fileoverview Dev-only perf helpers (legacy surface).
 * @module lib/utils/devPerf
 *
 * IMPORTANT:
 * Prefer `logger.perfMeasure(...)` from `src/security` for new code.
 * This module remains for backwards compatibility and is intentionally dev-only.
 */

import { logger } from '../security/logger';

/**
 * Measure a synchronous section (dev-only).
 */
export function devPerfMark(label: string) {
  const p: any = (globalThis as any).performance;
  const start = typeof p?.now === 'function' ? p.now() : Date.now();
  return {
    end(extra?: Record<string, any>) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        const end = typeof p?.now === 'function' ? p.now() : Date.now();
        const durationMs = Number(((end as number) - (start as number)).toFixed(1));
        // Treat label as an event name. Prefer channel-prefixed names, e.g. `storage.getItem`.
        logger.perf(label, { ...(extra ?? {}), durationMs });
      }
    },
  };
}

/**
 * Measure an async function (dev-only).
 */
export async function devTimeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const m = devPerfMark(label);
  try {
    return await fn();
  } finally {
    m.end();
  }
}

/**
 * Public aliases (naming matches common perf tooling vocabulary).
 * These remain dev-only and must never include sensitive payloads.
 */
export const perfMark = devPerfMark;
export const perfTimeAsync = devTimeAsync;
