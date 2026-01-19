/**
 * @fileoverview Security-first logger.
 * @module lib/security/logger
 *
 * Goals:
 * - Never log sensitive payloads (entries/notes/settings or full storage blobs)
 * - Dev-friendly metadata logs
 * - Production-safe (quiet by default)
 */

import { redact } from './redact';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

type Level = 'debug' | 'info' | 'warn' | 'error';

type AssertOptions = {
  maxString?: number;
  maxKeys?: number;
  maxArray?: number;
};

const DEFAULT_ASSERT: Required<AssertOptions> = {
  maxString: 160,
  maxKeys: 40,
  maxArray: 50,
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && (v as any).constructor === Object;
}

function looksSensitiveKey(k: string) {
  const s = k.toLowerCase();
  return (
    s === 'note' ||
    s === 'notes' ||
    s === 'entry' ||
    s === 'entries' ||
    s === 'mood' ||
    s.includes('moodly.') ||
    s.includes('entry') ||
    s.includes('note')
  );
}

/**
 * Dev-only guardrail: detect when a caller tries to log values that look like payloads.
 * This should prevent accidental "log the whole entries object" during development.
 */
export function assertNoSensitiveLogArgs(args: unknown[], opts: AssertOptions = {}): void {
  if (!IS_DEV) return;
  const o = { ...DEFAULT_ASSERT, ...opts };

  const seen = new WeakSet<object>();

  function scan(v: unknown, depth: number): boolean {
    if (v == null) return false;
    if (depth > 4) return true; // too deep; treat as suspicious

    if (typeof v === 'string') {
      // Long strings often represent notes or serialized blobs.
      if (v.length > o.maxString) return true;
      // Common serialized payload hints
      const t = v.trimStart();
      if ((t.startsWith('{') || t.startsWith('[')) && v.length > 60) return true;
      if (v.includes('"note"') || v.includes('"entries"') || v.includes('"mood"')) return true;
      return false;
    }

    if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return false;
    if (v instanceof Error) return false;

    if (Array.isArray(v)) {
      if (v.length > o.maxArray) return true;
      return v.some((x) => scan(x, depth + 1));
    }

    if (typeof v === 'object') {
      const obj = v as object;
      if (seen.has(obj)) return false;
      seen.add(obj);

      if (!isPlainObject(v)) return false;
      const keys = Object.keys(v);
      if (keys.length > o.maxKeys) return true;
      if (keys.some(looksSensitiveKey)) return true;
      return Object.values(v).some((x) => scan(x, depth + 1));
    }

    return false;
  }

  for (const a of args) {
    if (scan(a, 0)) {
      throw new Error(
        'Blocked unsafe log arguments (possible sensitive payload). Log metadata only.'
      );
    }
  }
}

function safeArgs(args: unknown[]) {
  // Redact + clamp; never pass raw objects that might contain sensitive payloads.
  return args.map((a) => redact(a));
}

function emit(level: Level, ...args: unknown[]) {
  // In production: be quiet by default; allow error-level with redaction.
  if (!IS_DEV && level !== 'error') return;

  // Dev-only enforcement: prevent accidental payload logs.
  try {
    assertNoSensitiveLogArgs(args);
  } catch (e) {
    const msg = (e as Error).message ?? 'Blocked unsafe log args';
    const fn = level === 'error' ? console.error : console.warn;
    fn('[security-logger]', msg);
    return;
  }

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

