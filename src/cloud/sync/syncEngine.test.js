/**
 * @fileoverview syncEngine retry and orchestration tests.
 */
import { runSyncCycle, resetSyncEngineForTests, registerCloudPullApplier } from './syncEngine';
import { restoreAuthSession } from '../auth/authService';
import { pullCloudDataToLocal } from './cloudPull';
import { pushOutboxToCloud } from './cloudPush';
jest.mock('../supabase/client', () => ({
    isSupabaseConfigured: () => true,
}));
jest.mock('../auth/authService', () => ({
    restoreAuthSession: jest.fn(),
}));
jest.mock('./cloudPull', () => ({
    pullCloudDataToLocal: jest.fn(async () => undefined),
}));
jest.mock('./cloudPush', () => ({
    pushOutboxToCloud: jest.fn(async () => ({ remaining: 1 })),
}));
jest.useFakeTimers();
describe('syncEngine', () => {
    beforeEach(() => {
        resetSyncEngineForTests();
        jest.clearAllMocks();
        registerCloudPullApplier({
            getLocalMoodEntries: async () => ({}),
            applyMoodEntries: async () => undefined,
            applyHabitSelections: async () => undefined,
            applyTrackedHabitIds: async () => undefined,
            applyGoalsRecord: async () => undefined,
            applySettings: async () => undefined,
            applyTasksRecord: async () => undefined,
            applyTaskDayItems: async () => undefined,
            applyInsightsTiming: async () => undefined,
        });
        restoreAuthSession.mockResolvedValue({
            user: { id: 'user-1' },
        });
    });
    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.useFakeTimers();
    });
    it('schedules retry with restored session after partial push', async () => {
        await runSyncCycle({ user: { id: 'user-1' } });
        expect(pushOutboxToCloud).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(15000);
        await Promise.resolve();
        await Promise.resolve();
        expect(restoreAuthSession).toHaveBeenCalledTimes(1);
        expect(pullCloudDataToLocal).toHaveBeenCalledTimes(2);
    });
});
