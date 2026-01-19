/**
 * @fileoverview Production-safe logger with redaction.
 * @module lib/logging/logger
 */

import { redact } from '../security/redact';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

type Level = 'debug' | 'info' | 'warn' | 'error';

function safeArgs(args: unknown[]) {
  // Redact + clamp; never pass raw objects that might contain sensitive payloads.
  return args.map((a) => redact(a));
}

function emit(level: Level, ...args: unknown[]) {
  // In production: be quiet by default; allow error-level with redaction.
  if (!IS_DEV && level !== 'error') return;
  const safe = safeArgs(args);
  const fn =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : console.log;
  fn(...(safe as any[]));
}

export const logger = {
  debug: (...args: unknown[]) => emit('debug', ...args),
  info: (...args: unknown[]) => emit('info', ...args),
  warn: (...args: unknown[]) => emit('warn', ...args),
  error: (...args: unknown[]) => emit('error', ...args),
};

