/**
 * Navigation timing helpers — thin facade over perfProbe.
 * Observes navigation; never mutates navigation state.
 *
 * @module perf/navigationMetrics
 */

import type { NavigationState, PartialState } from '@react-navigation/native';

import { MARK_NAV_DISPATCH, MARK_TAB_PRESS, PerfMarks } from './marks';
import { perfProbe } from './probe';

function safeRouteName(name: unknown): string | undefined {
  return typeof name === 'string' && name.length > 0 ? name : undefined;
}

function getActiveRouteName(
  state: NavigationState | PartialState<NavigationState> | undefined
): string | undefined {
  if (!state || typeof (state as NavigationState).index !== 'number') return undefined;
  const s = state as NavigationState;
  const route = s.routes[s.index];
  const name = safeRouteName(route?.name);
  const child = route?.state as NavigationState | PartialState<NavigationState> | undefined;
  return getActiveRouteName(child) ?? name;
}

/** Record tab bar press before dispatch (metadata-only). */
export function recordTabPress(tab: string): void {
  if (!perfProbe.enabled) return;
  const pressMark = MARK_TAB_PRESS(tab);
  perfProbe.mark(pressMark);
  perfProbe.breadcrumb(`${PerfMarks.tabPressReceived}:${tab}`);
  perfProbe.measureSince(PerfMarks.tabPressReceived, perfProbe.nowMs(), {
    tab,
    phase: 'warm',
    source: 'nav',
  });
  perfProbe.onMainTabPress(tab);
}

/** Record navigation dispatch immediately after tabPress (same synchronous turn). */
export function recordNavDispatch(tab: string): void {
  if (!perfProbe.enabled) return;
  perfProbe.mark(MARK_NAV_DISPATCH);
  perfProbe.breadcrumb(`${PerfMarks.tabPressDispatched}:${tab}`);
  perfProbe.measure(PerfMarks.tabPressDispatched, MARK_TAB_PRESS(tab), MARK_NAV_DISPATCH, {
    tab,
    phase: 'warm',
    source: 'nav',
  });
}

/** Alias used by older call sites. */
export function recordTabPressReceived(tab: string): void {
  recordTabPress(tab);
}

/** Record navigation container ready. */
export function recordNavReady(): void {
  perfProbe.onNavReady();
}

/** Record route change from NavigationContainer onStateChange. */
export function recordNavStateChange(
  state: NavigationState | PartialState<NavigationState> | undefined
): void {
  if (!perfProbe.enabled) return;
  perfProbe.onNavStateChange(state);
  const route = getActiveRouteName(state);
  if (route) perfProbe.breadcrumb(`${PerfMarks.navRouteChange}:${route}`);
}

/** Record destination screen focus (pair with tab press for tap→focus latency). */
export function recordScreenFocused(screenName: string, mainTab?: string): void {
  if (!perfProbe.enabled) return;
  perfProbe.onScreenFocus(screenName);
  if (mainTab) perfProbe.consumeMainTabPressToFocus(mainTab);
  perfProbe.breadcrumb(`${PerfMarks.screenFocus}:${screenName}`);
}

/** On destination tab focus — completes tap→focus if tab matches last press. */
export function recordTabFocus(tab: string): void {
  recordScreenFocused(tab, tab);
}

/** Parse active leaf route from a navigation root state snapshot. */
export function activeRouteFromState(
  state: NavigationState | PartialState<NavigationState> | undefined
): string | undefined {
  return getActiveRouteName(state);
}

/** Log structured nav route change (delegates to perfProbe). */
export function recordRouteChange(
  state: NavigationState | PartialState<NavigationState> | undefined
): void {
  recordNavStateChange(state);
}

export const navigationMetrics = {
  recordTabPress,
  recordNavDispatch,
  recordTabPressReceived,
  recordNavReady,
  recordNavStateChange,
  recordScreenFocused,
  recordTabFocus,
  recordRouteChange,
  activeRouteFromState,
};

export const NAV_METRIC_EVENTS = {
  tabPressToFocus: PerfMarks.tabPressToFocus,
  navToFocus: PerfMarks.navToFocus,
  routeChange: PerfMarks.navRouteChange,
} as const;
