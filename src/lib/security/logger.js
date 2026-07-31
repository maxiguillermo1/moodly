/**
 * @fileoverview Security-first logger.
 * @module lib/security/logger
 *
 * Goals:
 * - Never log sensitive payloads (entries/notes/settings or full storage blobs)
 * - Dev-friendly metadata logs
 * - Production-safe (quiet by default)
 * - Structured + channelized (observability, not debugging noise)
 */
import { redact } from './redact';
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const IS_PROD = !IS_DEV;
const DEFAULT_ASSERT = {
    maxString: 160,
    maxKeys: 40,
    maxArray: 50,
};
function isPlainObject(v) {
    return !!v && typeof v === 'object' && v.constructor === Object;
}
function looksSensitiveKey(k) {
    const s = k.toLowerCase();
    return (s === 'note' ||
        s === 'notes' ||
        s === 'entry' ||
        s === 'entries' ||
        s === 'mood' ||
        s.includes('kairo.') ||
        s.includes('entry') ||
        s.includes('note'));
}
function isChannel(v) {
    return (v === 'app' ||
        v === 'storage' ||
        v === 'session' ||
        v === 'calendar' ||
        v === 'journal' ||
        v === 'settings');
}
function channelFromEvent(event) {
    // Special-case: perf reports are emitted by calendar screens and must be
    // easy to grep/copy even when dev log budgets are reached.
    // This forces the channel prefix to match the expected output:
    // `[PERF][calendar] perf.report { ... }`
    if (IS_DEV && event === 'perf.report')
        return 'calendar';
    const first = String(event).split('.')[0] ?? '';
    if (isChannel(first))
        return first;
    // Default to app if event names are not channel-prefixed.
    return 'app';
}
/**
 * Dev-only guardrail: detect when a caller tries to log values that look like payloads.
 * This should prevent accidental "log the whole entries object" during development.
 */
export function assertNoSensitiveLogArgs(args, opts = {}) {
    if (!IS_DEV)
        return;
    const o = { ...DEFAULT_ASSERT, ...opts };
    const seen = new WeakSet();
    function scan(v, depth) {
        if (v == null)
            return false;
        if (depth > 4)
            return true; // too deep; treat as suspicious
        if (typeof v === 'string') {
            // Long strings often represent notes or serialized blobs.
            if (v.length > o.maxString)
                return true;
            // Common serialized payload hints
            const t = v.trimStart();
            if ((t.startsWith('{') || t.startsWith('[')) && v.length > 60)
                return true;
            if (v.includes('"note"') || v.includes('"entries"') || v.includes('"mood"'))
                return true;
            return false;
        }
        if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint')
            return false;
        if (v instanceof Error)
            return false;
        if (Array.isArray(v)) {
            if (v.length > o.maxArray)
                return true;
            return v.some((x) => scan(x, depth + 1));
        }
        if (typeof v === 'object') {
            const obj = v;
            if (seen.has(obj))
                return false;
            seen.add(obj);
            if (!isPlainObject(v))
                return false;
            const keys = Object.keys(v);
            if (keys.length > o.maxKeys)
                return true;
            if (keys.some(looksSensitiveKey))
                return true;
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
function safeMeta(meta) {
    // Redact + clamp; never pass raw objects that might contain sensitive payloads.
    return redact(meta ?? {});
}
// ---------------------------------------------------------------------------
// Log budget + rate limiting (prevents noise)
// ---------------------------------------------------------------------------
const DEFAULT_BUDGET_TOTAL = 240;
const DEFAULT_BUDGET_PER_CHANNEL = 60;
let totalLogs = 0;
const perChannelLogs = new Map();
const budgetSuppressed = new Set(); // keys like "total" | "calendar" | "log-budget"
function shouldSuppressForBudget(level, channel) {
    // Budget suppression is dev-only; in prod we emit minimal logs anyway.
    if (!IS_DEV)
        return false;
    if (totalLogs >= DEFAULT_BUDGET_TOTAL) {
        if (!budgetSuppressed.has('total')) {
            budgetSuppressed.add('total');
            // One diagnostic so engineers know why logs stopped.
            console.warn('[DEV][log-budget]', { scope: 'session', suppressed: true, budget: DEFAULT_BUDGET_TOTAL });
        }
        return true;
    }
    const prev = perChannelLogs.get(channel) ?? 0;
    if (prev >= DEFAULT_BUDGET_PER_CHANNEL) {
        const k = channel;
        if (!budgetSuppressed.has(k)) {
            budgetSuppressed.add(k);
            console.warn('[DEV][log-budget]', { scope: 'channel', channel, suppressed: true, budget: DEFAULT_BUDGET_PER_CHANNEL });
        }
        return true;
    }
    // Always allow WARN/ERROR even if channel is noisy (still respects total budget).
    if (level === 'WARN' || level === 'ERROR')
        return false;
    return false;
}
function countLog(channel) {
    totalLogs += 1;
    perChannelLogs.set(channel, (perChannelLogs.get(channel) ?? 0) + 1);
}
// WARN rate limit in production (metadata-only)
const WARN_RATE_LIMIT_MS = 30000;
const lastWarnByEvent = new Map();
function shouldRateLimitWarnInProd(event) {
    if (!IS_PROD)
        return false;
    const now = Date.now();
    const last = lastWarnByEvent.get(event) ?? 0;
    if (now - last < WARN_RATE_LIMIT_MS)
        return true;
    lastWarnByEvent.set(event, now);
    return false;
}
function isLevelEnabled(level) {
    // Production behavior:
    // - PERF/CACHE/DEV/BOOT/DATA disabled
    // - WARN allowed (rate-limited)
    // - ERROR allowed
    if (IS_PROD)
        return level === 'WARN' || level === 'ERROR';
    return true;
}
function emit(level, event, meta) {
    if (!isLevelEnabled(level))
        return;
    const channel = channelFromEvent(event);
    const bypassBudget = IS_DEV && event === 'perf.report';
    if (level === 'WARN' && shouldRateLimitWarnInProd(event))
        return;
    // Dev-only: never suppress the one-line perf report summary.
    if (!bypassBudget && shouldSuppressForBudget(level, channel))
        return;
    // Dev-only enforcement: prevent accidental payload logs.
    try {
        assertNoSensitiveLogArgs([event, meta]);
    }
    catch (e) {
        const msg = e.message ?? 'Blocked unsafe log args';
        // Always allow this one-line warning so engineers know why logs are missing.
        console.warn('[DEV][log-guard]', { event, channel, reason: msg });
        return;
    }
    const m = safeMeta(meta);
    // Keep formatting simple and grep-friendly.
    const prefix = `[${level}][${channel}]`;
    const method = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
    method(prefix, event, m);
    // Dev-only: don't count perf.report against budgets (it's the session summary).
    if (IS_DEV && !bypassBudget)
        countLog(channel);
}
function measureStart() {
    const p = globalThis.performance;
    return typeof p?.now === 'function' ? p.now() : Date.now();
}
async function perfMeasure(event, meta, fn) {
    // PERF is dev-only by contract.
    if (!IS_DEV)
        return await fn();
    const start = measureStart();
    try {
        return await fn();
    }
    finally {
        const end = measureStart();
        emit('PERF', event, { ...meta, durationMs: Number((end - start).toFixed(1)) });
    }
}
export const logger = {
    // -------------------------------------------------------------------------
    // Structured channels + levels (preferred)
    // -------------------------------------------------------------------------
    boot: (event, meta = {}) => emit('BOOT', event, meta),
    perf: (event, meta) => emit('PERF', event, meta),
    cache: (event, meta) => emit('CACHE', event, meta),
    data: (event, meta) => emit('DATA', event, meta),
    warn: (event, meta = {}) => emit('WARN', event, meta),
    dev: (event, meta = {}) => emit('DEV', event, meta),
    error: (event, meta = {}) => emit('ERROR', event, meta),
    // -------------------------------------------------------------------------
    // Perf helper (dev-only; structured output)
    // -------------------------------------------------------------------------
    perfMeasure,
    // -------------------------------------------------------------------------
    // Back-compat shims (avoid immediate refactor blast radius)
    // NOTE: Prefer structured methods above.
    // -------------------------------------------------------------------------
    debug: (...args) => emit('DEV', 'app.legacy.debug', { args }),
    info: (...args) => emit('DEV', 'app.legacy.info', { args }),
};
