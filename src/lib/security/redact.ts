/**
 * @fileoverview Redaction helpers to prevent sensitive data leakage in logs.
 * @module lib/security/redact
 *
 * Moodly is a local-first app, but logs can still leak via:
 * - device logs
 * - crash reports / screenshots
 * - shared debug output
 *
 * This module provides conservative redaction for common sensitive fields.
 */

const SENSITIVE_KEYS = new Set([
  'note',
  'notes',
  'entry',
  'entries',
  'mood',
  'moodly.entries',
  'moodly.settings',
  'payload',
  'data',
  'value',
]);

type RedactOptions = {
  maxDepth?: number;
  maxStringLength?: number;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && (v as any).constructor === Object;
}

function clampString(s: string, maxLen: number) {
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}…`;
}

function redactKey(k: string) {
  const key = k.toLowerCase();
  return SENSITIVE_KEYS.has(key) || key.includes('note') || key.includes('entry');
}

function safeErrorShape(e: Error) {
  // Never attach arbitrary properties; keep it minimal.
  return {
    name: e.name,
    message: e.message,
    // Stack traces can include file paths but not user content; still keep them dev-only at call sites.
    stack: e.stack,
  };
}

export function redact(value: unknown, opts: RedactOptions = {}): unknown {
  const maxDepth = opts.maxDepth ?? 4;
  const maxStringLength = opts.maxStringLength ?? 240;

  const seen = new WeakSet<object>();

  function walk(v: unknown, depth: number): unknown {
    if (v == null) return v;

    if (typeof v === 'string') return clampString(v, maxStringLength);
    if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return v;

    if (v instanceof Error) return safeErrorShape(v);

    if (depth >= maxDepth) return '[REDACTED]';

    if (Array.isArray(v)) {
      return v.map((x) => walk(x, depth + 1));
    }

    if (typeof v === 'object') {
      const obj = v as object;
      if (seen.has(obj)) return '[REDACTED]';
      seen.add(obj);

      // Preserve non-plain objects as an opaque label.
      if (!isPlainObject(v)) return '[REDACTED]';

      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) {
        if (redactKey(k)) {
          out[k] = '[REDACTED]';
        } else {
          out[k] = walk(val, depth + 1);
        }
      }
      return out;
    }

    return '[REDACTED]';
  }

  return walk(value, 0);
}

