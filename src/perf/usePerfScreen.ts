/**
 * Screen-level perf probes (dev-only).
 *
 * Goals:
 * - approximate navigation transition costs (routeChange -> focus -> afterInteractions)
 * - provide a stable place to summarize list render costs per screen
 *
 * NOTE: We intentionally avoid any UI changes (no new views).
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { perfProbe } from './probe';

export function usePerfScreen(
  screenName: string,
  opts?: {
    /**
     * IDs used by `PerfProfiler` for key lists on this screen.
     * We'll reset + summarize these per focus to approximate "worst-case list cost".
     */
    listIds?: string[];
  }
): void {
  const navigation = useNavigation<any>();
  // Keep listIds stable even if caller passes a new array literal each render.
  const listIdsKey = (opts?.listIds ?? []).join('|');
  const listIds = useMemo(() => (listIdsKey ? listIdsKey.split('|') : []), [listIdsKey]);

  const focusStartMsRef = useRef<number | null>(null);
  const transitionStartMsRef = useRef<number | null>(null);

  // Track transitionStart/End when supported (best-effort; event coverage varies by navigator type).
  useEffect(() => {
    if (!perfProbe.enabled) return;
    const add = navigation?.addListener?.bind?.(navigation);
    if (typeof add !== 'function') return;

    const unsubStart = add('transitionStart', () => {
      transitionStartMsRef.current = perfProbe.nowMs();
    });
    const unsubEnd = add('transitionEnd', () => {
      const start = transitionStartMsRef.current;
      transitionStartMsRef.current = null;
      if (typeof start !== 'number') return;
      perfProbe.measureSince('perf.navTransition', start, { phase: 'warm', source: 'nav', to: screenName });
    });

    return () => {
      // React Navigation returns an unsubscribe function.
      try {
        typeof unsubStart === 'function' && unsubStart();
      } catch {}
      try {
        typeof unsubEnd === 'function' && unsubEnd();
      } catch {}
    };
  }, [navigation, screenName]);

  useFocusEffect(
    useCallback(() => {
      if (!perfProbe.enabled) return;

      const focusStartMs = perfProbe.nowMs();
      focusStartMsRef.current = focusStartMs;

      // Approximate "nav-to-focus" (route change observed at container -> focused screen).
      perfProbe.onScreenFocus(screenName);

      // Reset list render stats for this screen so we can report "worst commit" during focus.
      if (listIds.length) perfProbe.resetRenderStats(listIds);

      // Approximate "focus -> interaction ready" for this screen.
      const task = InteractionManager.runAfterInteractions(() => {
        const start = focusStartMsRef.current;
        if (typeof start === 'number') {
          perfProbe.measureSince('perf.screenInteractionReady', start, { phase: 'warm', source: 'ui', screen: screenName });
        }

        // Summarize render costs for key lists on this screen.
        if (listIds.length) {
          perfProbe.logRenderSummary('perf.listRenderSummary', listIds, {
            phase: 'warm',
            source: 'ui',
            screen: screenName,
          });
        }
      });

      return () => {
        focusStartMsRef.current = null;
        task.cancel();
      };
    }, [listIds, screenName])
  );
}

