/**
 * Dev-only performance probes for Moodly.
 *
 * ABSOLUTE RULES:
 * - Dev-only: must not add production runtime weight or change behavior.
 * - Metadata-only: never log notes, entry payloads, settings payloads, or large objects.
 *
 * This module is intentionally small + reversible.
 * To revert: delete `src/perf/*` and remove the few imports in `App.tsx`, `src/app/RootApp.tsx`,
 * and the screen-level hooks/wrappers.
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';
import type { NavigationState, PartialState } from '@react-navigation/native';

import { logger } from '../security';

const PERF_ENABLED = typeof __DEV__ !== 'undefined' && !!__DEV__;

type MarkName = string;
type RenderId = string;

type RenderStats = {
  commits: number;
  maxActualDurationMs: number;
  maxBaseDurationMs: number;
  sumActualDurationMs: number;
  lastPhase: 'mount' | 'update' | 'nested-update';
};

type LastNav = {
  atMs: number;
  from?: string;
  to?: string;
};

const marks = new Map<MarkName, number>();
const renderStats = new Map<RenderId, RenderStats>();
let didLogDeviceInfo = false;
let appStartMs: number | null = null;
let navReadyMs: number | null = null;
let lastNav: LastNav | null = null;

// ---------------------------------------------------------------------------
// Dev-only JS hitch detector (frame delta > 24ms)
// ---------------------------------------------------------------------------
// IMPORTANT:
// - Dev-only + metadata-only.
// - Best-effort: detects JS thread stalls (GC, heavy sync work, etc.), not UI-thread stalls.
// - Screens may set a "culprit phase" to help attribute hitches to a rough operation window.
let hitchRunning = false;
let lastRafTs: number | null = null;
let culpritPhase: string | null = null;
let didWarnSlowFrameDuringCalendarScroll = false;

const SLOW_FRAME_WARN_THRESHOLD_MS = 16;
function isCalendarScrollPhase(phase: string | null): boolean {
  return phase === 'CalendarScreen.scroll' || phase === 'CalendarView.scroll';
}

// ---------------------------------------------------------------------------
// Dev-only hitch breadcrumbs (ring buffer)
// ---------------------------------------------------------------------------
// Purpose:
// - When a hitch happens without an explicit culpritPhase tag, we infer its phase
//   from the nearest breadcrumb within a short time window.
// - If no breadcrumb is nearby, classify as DEV_METRO_OR_GC (dev tooling stall, GC, etc).
type Breadcrumb = { atMs: number; name: string };
const BREADCRUMB_LAST_N = 50;
const BREADCRUMB_EMIT_N = 20;
const BREADCRUMB_INFER_WINDOW_MS = 50;
const breadcrumbs: Breadcrumb[] = [];

function addBreadcrumb(name: string): void {
  if (!PERF_ENABLED) return;
  // Keep names short/stable. Never include payload-like data.
  const atMs = Number(nowMs().toFixed(1));
  breadcrumbs.push({ atMs, name });
  if (breadcrumbs.length > BREADCRUMB_LAST_N) breadcrumbs.splice(0, breadcrumbs.length - BREADCRUMB_LAST_N);
}

function inferPhaseForHitch(atMs: number): { phase: string; src: 'tag' | 'crumb' | 'dev' } {
  const explicit = culpritPhase;
  if (explicit) return { phase: explicit, src: 'tag' };

  // Find nearest breadcrumb in the last ~50ms window.
  // Note: breadcrumbs are append-only and time-ordered.
  for (let i = breadcrumbs.length - 1; i >= 0; i--) {
    const b = breadcrumbs[i]!;
    const dt = Math.abs(atMs - b.atMs);
    if (dt <= BREADCRUMB_INFER_WINDOW_MS) return { phase: b.name, src: 'crumb' };
    // Since we're walking backward, once we're beyond the window, older will also be beyond.
    if (b.atMs < atMs - BREADCRUMB_INFER_WINDOW_MS) break;
  }

  return { phase: 'DEV_METRO_OR_GC', src: 'dev' };
}

// In-memory hitch stats aggregator (dev-only).
// We keep a small rolling sample per phase to approximate p95 without heavy memory cost.
type HitchSample = { atMs: number; phase: string; deltaMs: number; src?: 'tag' | 'crumb' | 'dev' };
type PhaseStats = {
  count: number;
  maxMs: number;
  // Ring buffer of recent deltas for approximate p95.
  samples: number[];
  samplesCap: number;
  samplesWriteIdx: number;
  samplesFilled: number;
};

const HITCH_SAMPLES_PER_PHASE = 180;
const HITCH_LAST_N = 120;
const HITCH_LAST_EMIT_N = 20;

let hitchTotal = 0;
const hitchByPhase = new Map<string, PhaseStats>();
const hitchLast: HitchSample[] = [];

// Logging policy: keep `perf.report` as the primary output.
// `perf.hitch` is only emitted for large hitches or repeated DEV_METRO_OR_GC stalls.
const DEV_HITCH_LOG_MIN_INTERVAL_MS = 750;
const DEV_METRO_OR_GC_LOG_THRESHOLD_MS = 300;
const DEV_METRO_OR_GC_REPEAT_WINDOW_MS = 10_000;
const DEV_METRO_OR_GC_REPEAT_COUNT = 3; // "repeats > 3 times" -> log on 4th
let lastHitchLogAtMs = 0;
const devMetroOrGcAtMs: number[] = [];

function shouldLogHitch(deltaMs: number, inferred: { phase: string; src: 'tag' | 'crumb' | 'dev' }, atMs: number): boolean {
  // Rate-limit regardless of type.
  if (atMs - lastHitchLogAtMs < DEV_HITCH_LOG_MIN_INTERVAL_MS) return false;

  if (inferred.src === 'dev' || inferred.phase === 'DEV_METRO_OR_GC') {
    // Only print DEV_METRO_OR_GC when huge OR repeats > 3 times in 10 seconds.
    devMetroOrGcAtMs.push(atMs);
    while (devMetroOrGcAtMs.length && devMetroOrGcAtMs[0]! < atMs - DEV_METRO_OR_GC_REPEAT_WINDOW_MS) devMetroOrGcAtMs.shift();
    const repeats = devMetroOrGcAtMs.length > DEV_METRO_OR_GC_REPEAT_COUNT;
    return deltaMs >= DEV_METRO_OR_GC_LOG_THRESHOLD_MS || repeats;
  }

  // Non-dev attribution: log only for meaningful hitches (avoid micro spam).
  return deltaMs >= 120;
}

function recordHitchAt(
  deltaMs: number,
  atMs: number,
  inferred: { phase: string; src: 'tag' | 'crumb' | 'dev' }
): void {
  const phase = inferred.phase;
  hitchTotal += 1;

  // Rolling window of last N hitches (metadata-only).
  hitchLast.push({
    atMs: Number(atMs.toFixed(1)),
    phase,
    deltaMs: Number(deltaMs.toFixed(1)),
    src: inferred.src,
  });
  if (hitchLast.length > HITCH_LAST_N) hitchLast.splice(0, hitchLast.length - HITCH_LAST_N);

  const prev = hitchByPhase.get(phase);
  if (!prev) {
    hitchByPhase.set(phase, {
      count: 1,
      maxMs: deltaMs,
      samples: [deltaMs],
      samplesCap: HITCH_SAMPLES_PER_PHASE,
      samplesWriteIdx: 1,
      samplesFilled: 1,
    });
    return;
  }

  prev.count += 1;
  prev.maxMs = Math.max(prev.maxMs, deltaMs);
  if (prev.samplesFilled < prev.samplesCap) {
    prev.samples.push(deltaMs);
    prev.samplesFilled += 1;
    prev.samplesWriteIdx = prev.samples.length % prev.samplesCap;
  } else {
    // Ring overwrite.
    prev.samples[prev.samplesWriteIdx] = deltaMs;
    prev.samplesWriteIdx = (prev.samplesWriteIdx + 1) % prev.samplesCap;
  }
}

function approxP95Ms(samples: number[]): number {
  if (!samples.length) return 0;
  // Sort a copy on flush only (dev-only).
  const arr = samples.slice().sort((a, b) => a - b);
  const idx = Math.min(arr.length - 1, Math.floor(arr.length * 0.95));
  return Number(arr[idx]!.toFixed(1));
}

function clearCulpritNextFrames(frames: number): void {
  if (!PERF_ENABLED) return;
  const n = Math.max(1, Math.min(frames, 6)); // hard cap; avoid accidental long chains
  let i = 0;
  const step = () => {
    i += 1;
    if (i >= n) {
      culpritPhase = null;
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function nowMs(): number {
  const p: any = (globalThis as any).performance;
  return typeof p?.now === 'function' ? p.now() : Date.now();
}

function safeRouteName(name: unknown): string | undefined {
  return typeof name === 'string' && name.length > 0 ? name : undefined;
}

function getActiveRouteName(state: NavigationState | PartialState<NavigationState> | undefined): string | undefined {
  if (!state || typeof (state as any).index !== 'number' || !Array.isArray((state as any).routes)) return undefined;
  const s: any = state as any;
  const r = s.routes?.[s.index];
  const name = safeRouteName(r?.name);
  // Recurse into nested navigators.
  const child = r?.state as any;
  return getActiveRouteName(child) ?? name;
}

export const perfProbe = {
  enabled: PERF_ENABLED,
  nowMs,

  init(): void {
    if (!PERF_ENABLED) return;
    if (appStartMs == null) appStartMs = nowMs();
    if (!didLogDeviceInfo) {
      didLogDeviceInfo = true;
      const win = Dimensions.get('window');
      logger.boot('perf.deviceInfo', {
        platform: Platform.OS,
        platformVersion: Platform.Version,
        hermes: typeof (globalThis as any).HermesInternal === 'object',
        winW: Math.round(win.width),
        winH: Math.round(win.height),
        pixelRatio: PixelRatio.get(),
      });
    }
    logger.perf('perf.appStart', { phase: 'cold', source: 'app', t0Ms: appStartMs });

    // Start hitch detector once per app session (dev-only).
    if (!hitchRunning) {
      hitchRunning = true;
      lastRafTs = null;
      const loop = (ts: number) => {
        if (!PERF_ENABLED) return;
        if (typeof lastRafTs === 'number') {
          const delta = ts - lastRafTs;
          // Dev-only micro-warning: if a frame exceeds ~16ms during calendar scroll, log once.
          // This is intentionally separate from the hitch (>24ms) classifier and does not affect perf.report.
          if (
            !didWarnSlowFrameDuringCalendarScroll &&
            delta > SLOW_FRAME_WARN_THRESHOLD_MS &&
            isCalendarScrollPhase(culpritPhase)
          ) {
            didWarnSlowFrameDuringCalendarScroll = true;
            logger.dev('calendar.slowFrame', {
              phase: culpritPhase,
              deltaMs: Number(delta.toFixed(1)),
              thresholdMs: SLOW_FRAME_WARN_THRESHOLD_MS,
            });
          }
          // 60fps ~ 16.7ms; anything > 24ms tends to feel like a hitch.
          if (delta > 24) {
            const atMs = nowMs();
            const inferred = inferPhaseForHitch(atMs);
            recordHitchAt(delta, atMs, inferred);
            if (shouldLogHitch(delta, inferred, atMs)) {
              lastHitchLogAtMs = atMs;
              logger.perf('perf.hitch', {
                phase: 'warm',
                source: 'ui',
                deltaMs: Number(delta.toFixed(1)),
                culpritPhase,
                inferredPhase: inferred.phase,
                inferredSrc: inferred.src,
              });
            }
          }
        }
        lastRafTs = ts;
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  },

  /**
   * Set a best-effort "CULPRIT PHASE" tag for the hitch detector.
   * Keep these short, stable strings (e.g. "CalendarScreen.scroll", "CalendarScreen.dayTap").
   */
  setCulpritPhase(phase: string | null): void {
    if (!PERF_ENABLED) return;
    culpritPhase = phase;
  },

  clearCulpritAfterFrames(frames: number): void {
    clearCulpritNextFrames(frames);
  },

  /**
   * Dev-only: add a small "breadcrumb" marker used for hitch attribution.
   * This does not log. It only stores the last N marker names in-memory.
   */
  breadcrumb(name: string): void {
    addBreadcrumb(name);
  },

  /**
   * Dev-only: log a single screen-session start marker.
   * Use this (plus perf.report on blur) to keep perf logs grouped and readable.
   */
  screenSessionStart(screen: string): void {
    if (!PERF_ENABLED) return;
    addBreadcrumb(`${screen}.sessionStart`);
    logger.perf('perf.sessionStart', { phase: 'warm', source: 'ui', screen });
  },

  /**
   * Dev-only: log a single structured summary of hitches collected so far.
   * This is intentionally metadata-only (counts, phases, timings).
   */
  flushReport(reason: string): void {
    if (!PERF_ENABLED) return;

    const phases = Array.from(hitchByPhase.entries())
      .map(([phase, s]) => ({
        phase,
        count: s.count,
        maxMs: Number(s.maxMs.toFixed(1)),
        p95Ms: approxP95Ms(s.samples),
      }))
      .sort((a, b) => b.count - a.count || b.maxMs - a.maxMs)
      .slice(0, 24); // cap to keep logs readable

    // Phase 4A: emit a truncated `last` array so dev log-guard never blocks perf.report.
    // Keep the internal ring buffer intact; only truncate the emitted payload.
    const lastLen = hitchLast.length;
    const last = lastLen > HITCH_LAST_EMIT_N ? hitchLast.slice(-HITCH_LAST_EMIT_N) : hitchLast;
    const lastDropped = Math.max(0, lastLen - last.length);

    const crumbLen = breadcrumbs.length;
    const crumbLast = crumbLen > BREADCRUMB_EMIT_N ? breadcrumbs.slice(-BREADCRUMB_EMIT_N) : breadcrumbs;
    const crumbDropped = Math.max(0, crumbLen - crumbLast.length);

    logger.perf('perf.report', {
      phase: 'warm',
      source: 'ui',
      reason,
      totalHitches: hitchTotal,
      phases,
      last,
      lastDropped,
      crumbs: crumbLast,
      crumbsDropped: crumbDropped,
    });

    // Reset after flush so per-screen sessions are comparable.
    hitchTotal = 0;
    hitchByPhase.clear();
    hitchLast.length = 0;
    didWarnSlowFrameDuringCalendarScroll = false;
  },

  mark(name: MarkName): void {
    if (!PERF_ENABLED) return;
    marks.set(name, nowMs());
  },

  measure(event: string, startMark: MarkName, endMark: MarkName, meta: Record<string, unknown> = {}): void {
    if (!PERF_ENABLED) return;
    const a = marks.get(startMark);
    const b = marks.get(endMark);
    if (typeof a !== 'number' || typeof b !== 'number') return;
    const durationMs = Number((b - a).toFixed(1));
    logger.perf(event, { ...meta, durationMs });
  },

  measureSince(event: string, startMs: number, meta: Record<string, unknown> = {}): void {
    if (!PERF_ENABLED) return;
    const durationMs = Number((nowMs() - startMs).toFixed(1));
    logger.perf(event, { ...meta, durationMs });
  },

  onNavReady(): void {
    if (!PERF_ENABLED) return;
    navReadyMs = nowMs();
    if (appStartMs != null) {
      logger.perf('perf.navReady', { phase: 'cold', source: 'nav', durationMs: Number((navReadyMs - appStartMs).toFixed(1)) });
    } else {
      logger.perf('perf.navReady', { phase: 'cold', source: 'nav' });
    }
  },

  onNavStateChange(state: NavigationState | PartialState<NavigationState> | undefined): void {
    if (!PERF_ENABLED) return;
    const to = getActiveRouteName(state);
    const from = lastNav?.to;
    const atMs = nowMs();
    lastNav = { atMs, from, to };
    if (to && to !== from) {
      logger.perf('perf.navRouteChange', { phase: 'warm', source: 'nav', from, to });
    }
  },

  /**
   * Called on screen focus to produce an approximate "transition-to-focus" number.
   * This is best-effort (tabs vs stack transitions differ), so treat as directional.
   */
  onScreenFocus(screenName: string): void {
    if (!PERF_ENABLED) return;
    const ln = lastNav;
    if (!ln?.to || ln.to !== screenName) return;
    const deltaMs = Number((nowMs() - ln.atMs).toFixed(1));
    logger.perf('perf.navToFocus', { phase: 'warm', source: 'nav', to: screenName, from: ln.from, durationMs: deltaMs });
  },

  recordRenderCommit(
    id: RenderId,
    phase: 'mount' | 'update' | 'nested-update',
    actualDurationMs: number,
    baseDurationMs: number
  ): void {
    if (!PERF_ENABLED) return;
    const prev = renderStats.get(id);
    const next: RenderStats = prev
      ? {
          commits: prev.commits + 1,
          maxActualDurationMs: Math.max(prev.maxActualDurationMs, actualDurationMs),
          maxBaseDurationMs: Math.max(prev.maxBaseDurationMs, baseDurationMs),
          sumActualDurationMs: prev.sumActualDurationMs + actualDurationMs,
          lastPhase: phase,
        }
      : {
          commits: 1,
          maxActualDurationMs: actualDurationMs,
          maxBaseDurationMs: baseDurationMs,
          sumActualDurationMs: actualDurationMs,
          lastPhase: phase,
        };
    renderStats.set(id, next);
  },

  resetRenderStats(ids: RenderId[]): void {
    if (!PERF_ENABLED) return;
    ids.forEach((id) => renderStats.delete(id));
  },

  logRenderSummary(event: string, ids: RenderId[], meta: Record<string, unknown> = {}): void {
    if (!PERF_ENABLED) return;
    const summary = ids
      .map((id) => {
        const s = renderStats.get(id);
        if (!s) return null;
        return {
          id,
          commits: s.commits,
          maxActualMs: Number(s.maxActualDurationMs.toFixed(1)),
          avgActualMs: Number((s.sumActualDurationMs / Math.max(1, s.commits)).toFixed(1)),
          maxBaseMs: Number(s.maxBaseDurationMs.toFixed(1)),
          lastPhase: s.lastPhase,
        };
      })
      .filter(Boolean);
    if (summary.length === 0) return;
    // Metadata-only: summary is numeric + ids only.
    logger.perf(event, { ...meta, lists: summary });
  },

  /**
   * Approximate "first interaction readiness":
   * call this after `InteractionManager.runAfterInteractions` fires.
   */
  logFirstInteractionReady(meta: Record<string, unknown> = {}): void {
    if (!PERF_ENABLED) return;
    if (appStartMs == null) return;
    const durationMs = Number((nowMs() - appStartMs).toFixed(1));
    logger.perf('perf.firstInteractionReady', { phase: 'cold', source: 'app', durationMs, ...meta });
  },

  getDebugSnapshot(): { appStartMs: number | null; navReadyMs: number | null; lastNav: LastNav | null } {
    return { appStartMs, navReadyMs, lastNav };
  },
};

