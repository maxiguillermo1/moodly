/**
 * @fileoverview Focus-deferred goals list reload.
 * @module hooks/useGoalsFocusLoad
 */

import { useCallback, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { Goal } from '../types';
import { getGoals } from '../storage';
import { sortGoalsForDisplay } from '../utils';
import { logger } from '../security';
import { perfProbe } from '../perf';

export function useGoalsFocusLoad(screen = 'GoalsScreen') {
  const [goals, setGoals] = useState<Goal[]>([]);
  const didFlushPerfReportRef = useRef(false);

  const reload = useCallback(async () => {
    try {
      setGoals(sortGoalsForDisplay(await getGoals()));
    } catch (error) {
      logger.warn('goals.screen.load.failed', { error });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (perfProbe.enabled) didFlushPerfReportRef.current = false;
      const task = InteractionManager.runAfterInteractions(() => {
        void reload();
      });
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
