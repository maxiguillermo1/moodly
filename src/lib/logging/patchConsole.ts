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

function isAllowedInProd(method: 'log' | 'warn' | 'error', safeArgs: unknown[]) {
  // In production:
  // - Allow errors (redacted) always
  // - Allow WARN only if it matches our structured logger prefix
  // - Silence everything else to prevent accidental leakage/noise
  if (method === 'error') return true;
  if (method !== 'warn') return false;
  const first = safeArgs[0];
  return typeof first === 'string' && first.startsWith('[WARN][');
}

function wrap(method: 'log' | 'warn' | 'error') {
  const original = console[method].bind(console);
  return (...args: unknown[]) => {
    const safeArgs = args.map((a) => redact(a));
    if (!IS_DEV && !isAllowedInProd(method, safeArgs)) return;
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

