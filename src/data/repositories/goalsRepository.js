/**
 * @fileoverview Repository façade for goals.
 * @module data/repositories/goalsRepository
 */
import * as goalsImpl from '../storage/goalsStorage';
export * from '../storage/goalsStorage';
export const goalsRepository = {
    getGoals: goalsImpl.getGoals,
    upsertGoal: goalsImpl.upsertGoal,
    addGoalProgress: goalsImpl.addGoalProgress,
    archiveGoal: goalsImpl.archiveGoal,
    completeGoal: goalsImpl.completeGoal,
    deleteGoal: goalsImpl.deleteGoal,
};
