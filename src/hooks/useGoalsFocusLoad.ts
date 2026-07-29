/**
 * @fileoverview Focus-deferred goals list reload.
 * @module hooks/useGoalsFocusLoad
 */

import { useCallback, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { Goal } from '../types';
import { getGoals, getGoalsCacheGeneration, peekGoalsFromSessionCache } from '../storage';
import { goalsDisplaySame, sortGoalsForDisplay } from '../utils';
import { logger } from '../security';
import { perfProbe } from '../perf';

export function useGoalsFocusLoad(screen = 'GoalsScreen') {
  const [goals, setGoals] = useState<Goal[]>(() => {
    const peeked = peekGoalsFromSessionCache();
    return peeked ? sortGoalsForDisplay(peeked) : [];
  });
  const didFlushPerfReportRef = useRef(false);
  const lastGoalsGenerationRef = useRef(-1);
  const loadCountRef = useRef(0);

  const reload = useCallback(async () => {
    const generation = getGoalsCacheGeneration();
    if (lastGoalsGenerationRef.current === generation && loadCountRef.current > 0) {
      return;
    }

    loadCountRef.current += 1;
    try {
      const sorted = sortGoalsForDisplay(await getGoals());
      setGoals((prev) => (goalsDisplaySame(prev, sorted) ? prev : sorted));
      lastGoalsGenerationRef.current = getGoalsCacheGeneration();
    } catch (error) {
      logger.warn('goals.screen.load.failed', { error });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (perfProbe.enabled) didFlushPerfReportRef.current = false;

      const runReload = () => {
        void reload();
      };

      const peeked = peekGoalsFromSessionCache();
      if (peeked) {
        const sorted = sortGoalsForDisplay(peeked);
        setGoals((prev) => (goalsDisplaySame(prev, sorted) ? prev : sorted));
      }

      const generation = getGoalsCacheGeneration();
      const warmReturn = lastGoalsGenerationRef.current === generation && loadCountRef.current > 0;
      if (warmReturn || peeked !== undefined) {
        queueMicrotask(runReload);
        return () => {
          if (perfProbe.enabled && !didFlushPerfReportRef.current) {
            didFlushPerfReportRef.current = true;
            perfProbe.flushReport(`${screen}.blur`);
          }
        };
      }

      const task = InteractionManager.runAfterInteractions(runReload);
      return () => {
        task.cancel();
        if (perfProbe.enabled && !didFlushPerfReportRef.current) {
          didFlushPerfReportRef.current = true;
          perfProbe.flushReport(`${screen}.blur`);
        }
      };
    }, [reload, screen])
  );

  return { goals, setGoals, reload };
}
