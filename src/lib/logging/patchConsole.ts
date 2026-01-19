/**
 * @fileoverview Harden console.* to prevent accidental sensitive data leakage.
 * @module lib/logging/patchConsole
 *
 * This is intentionally local-first friendly:
 * - In dev: keep logs, but redacted.
 * - In prod: allow only redacted console.error; silence log/warn by default.
 */

import { redact } from '../security/redact';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

let installed = false;

function wrap(method: 'log' | 'warn' | 'error') {
  const original = console[method].bind(console);
  return (...args: unknown[]) => {
    const safeArgs = args.map((a) => redact(a));
    // In prod: only allow errors; avoid logs that can leak via device logs.
    if (!IS_DEV && method !== 'error') return;
    original(...(safeArgs as any[]));
  };
}

export function installSafeConsole(): void {
  if (installed) return;
  installed = true;
  console.log = wrap('log') as any;
  console.warn = wrap('warn') as any;
  console.error = wrap('error') as any;
}

