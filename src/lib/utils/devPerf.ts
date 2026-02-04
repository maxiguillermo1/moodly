/**
 * @fileoverview Dev-only perf + logging helpers (no prod spam).
 * @module lib/utils/devPerf
 */

type PerfNow = () => number;

const now: PerfNow = () => {
  const p: any = (globalThis as any).performance;
  return typeof p?.now === 'function' ? p.now() : Date.now();
};

export function devLog(...args: any[]) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // Keep logs minimal and consistent.
    console.log(...args);
  }
}

export function devWarn(...args: any[]) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(...args);
  }
}

/**
 * Measure a synchronous section (dev-only).
 */
export function devPerfMark(label: string) {
  const start = now();
  return {
    end(extra?: Record<string, any>) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        const ms = now() - start;
        devLog(`[perf] ${label}: ${ms.toFixed(1)}ms`, extra ?? '');
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
