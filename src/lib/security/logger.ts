/**
 * @fileoverview Security-first structured logger.
 * @module lib/security/logger
 *
 * Goals:
 * - Never log sensitive payloads (entries/notes/settings or full storage blobs)
 * - Structured, channelized logs (observability, not debugging noise)
 * - Dev-first: PERF/CACHE/DEV/BOOT/DATA are dev-only unless explicitly allowed
 * - Production-safe: WARN/ERROR only (metadata-only, WARN rate-limited)
 */

import { redact } from './redact';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const IS_PROD = !IS_DEV;

export type LogLevel = 'BOOT' | 'PERF' | 'CACHE' | 'DATA' | 'WARN' | 'DEV' | 'ERROR';
export type LogChannel = 'app' | 'storage' | 'session' | 'calendar' | 'journal' | 'settings';

export type PerfPhase = 'cold' | 'warm' | 'revalidate';
export type PerfSource = 'storage' | 'sessionCache';

export type LogMeta = Record<string, unknown>;

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

function isChannel(v: string): v is LogChannel {
  return (
    v === 'app' ||
    v === 'storage' ||
    v === 'session' ||
    v === 'calendar' ||
    v === 'journal' ||
    v === 'settings'
  );
}

function channelFromEvent(event: string): LogChannel {
  const first = String(event).split('.')[0] ?? '';
  return isChannel(first) ? first : 'app';
}

/**
 * Dev-only guardrail: detect when a caller tries to log values that look like payloads.
 * This should prevent accidental logging of entries/settings/notes blobs.
 */
export function assertNoSensitiveLogArgs(args: unknown[], opts: AssertOptions = {}): void {
  if (!IS_DEV) return;
  const o = { ...DEFAULT_ASSERT, ...opts };

  const seen = new WeakSet<object>();

  function scan(v: unknown, depth: number): boolean {
    if (v == null) return false;
    if (depth > 4) return true; // too deep; treat as suspicious

    if (typeof v === 'string') {
      if (v.length > o.maxString) return true;
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
      throw new Error('Blocked unsafe log arguments (possible sensitive payload). Log metadata only.');
    }
  }
}

function safeMeta(meta: LogMeta | undefined): LogMeta {
  return (redact(meta ?? {}) as any) as LogMeta;
}

// ---------------------------------------------------------------------------
// Log budget + rate limiting
// ---------------------------------------------------------------------------

const DEFAULT_BUDGET_TOTAL = 240;
const DEFAULT_BUDGET_PER_CHANNEL = 60;

let totalLogs = 0;
const perChannelLogs = new Map<LogChannel, number>();
const budgetNotices = new Set<string>(); // keys like "total" | "channel:calendar"

function shouldSuppressForBudget(level: LogLevel, channel: LogChannel): boolean {
  // Budget suppression is dev-only; production emits minimal logs anyway.
  if (!IS_DEV) return false;

  // Always allow WARN/ERROR through budget gates (still counts, but don't suppress).
  if (level === 'WARN' || level === 'ERROR') return false;

  if (totalLogs >= DEFAULT_BUDGET_TOTAL) {
    if (!budgetNotices.has('total')) {
      budgetNotices.add('total');
      console.warn('[DEV][log-budget]', { scope: 'session', suppressed: true, budget: DEFAULT_BUDGET_TOTAL });
    }
    return true;
  }

  const c = perChannelLogs.get(channel) ?? 0;
  if (c >= DEFAULT_BUDGET_PER_CHANNEL) {
    const key = `channel:${channel}`;
    if (!budgetNotices.has(key)) {
      budgetNotices.add(key);
      console.warn('[DEV][log-budget]', { scope: 'channel', channel, suppressed: true, budget: DEFAULT_BUDGET_PER_CHANNEL });
    }
    return true;
  }

  return false;
}

function countLog(channel: LogChannel) {
  totalLogs += 1;
  perChannelLogs.set(channel, (perChannelLogs.get(channel) ?? 0) + 1);
}

// WARN rate limit in production (metadata-only)
const WARN_RATE_LIMIT_MS = 30_000;
const lastWarnByEvent = new Map<string, number>();

function shouldRateLimitWarnInProd(event: string): boolean {
  if (!IS_PROD) return false;
  const now = Date.now();
  const last = lastWarnByEvent.get(event) ?? 0;
  if (now - last < WARN_RATE_LIMIT_MS) return true;
  lastWarnByEvent.set(event, now);
  return false;
}

function isLevelEnabled(level: LogLevel): boolean {
  // Production behavior:
  // - PERF/CACHE/DEV/BOOT/DATA disabled
  // - WARN allowed (rate-limited)
  // - ERROR allowed
  if (IS_PROD) return level === 'WARN' || level === 'ERROR';
  return true;
}

function nowMs(): number {
  const p: any = (globalThis as any).performance;
  return typeof p?.now === 'function' ? p.now() : Date.now();
}

function emit(level: LogLevel, event: string, meta?: LogMeta): void {
  if (!isLevelEnabled(level)) return;

  const channel = channelFromEvent(event);

  if (level === 'WARN' && shouldRateLimitWarnInProd(event)) return;
  if (shouldSuppressForBudget(level, channel)) return;

  try {
    assertNoSensitiveLogArgs([event, meta]);
  } catch (e) {
    const msg = (e as Error).message ?? 'Blocked unsafe log args';
    console.warn('[DEV][log-guard]', { event, channel, reason: msg });
    return;
  }

  const m = safeMeta(meta);

  // No interpolated content in strings. Use constant prefix + structured meta.
  const prefix = `[${level}][${channel}]`;
  const method = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
  method(prefix, event, m);

  if (IS_DEV) countLog(channel);
}

async function perfMeasure<T>(event: string, meta: LogMeta, fn: () => Promise<T>): Promise<T> {
  // PERF is dev-only by contract.
  if (!IS_DEV) return await fn();
  const start = nowMs();
  try {
    return await fn();
  } finally {
    const end = nowMs();
    emit('PERF', event, { ...meta, durationMs: Number((end - start).toFixed(1)) });
  }
}

export const logger = {
  // Structured channels + levels (preferred)
  boot: (event: string, meta: LogMeta = {}) => emit('BOOT', event, meta),
  perf: (event: string, meta: LogMeta) => emit('PERF', event, meta),
  cache: (event: string, meta: LogMeta) => emit('CACHE', event, meta),
  data: (event: string, meta: LogMeta) => emit('DATA', event, meta),
  warn: (event: string, meta: LogMeta = {}) => emit('WARN', event, meta),
  dev: (event: string, meta: LogMeta = {}) => emit('DEV', event, meta),
  error: (event: string, meta: LogMeta = {}) => emit('ERROR', event, meta),

  // Perf helper (dev-only; structured output)
  perfMeasure,

  // Back-compat shims (avoid immediate refactor blast radius)
  debug: (...args: unknown[]) => emit('DEV', 'app.legacy.debug', { args }),
  info: (...args: unknown[]) => emit('DEV', 'app.legacy.info', { args }),
};

export type Logger = typeof logger;
