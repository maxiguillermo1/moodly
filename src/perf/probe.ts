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

