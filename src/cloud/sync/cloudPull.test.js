/**
 * @fileoverview cloudPull integration tests (Supabase mock + applier).
 */
import { pullCloudDataToLocal } from './cloudPull';
function queryChain(result, mode = 'list') {
    const chain = {};
    chain.select = jest.fn(() => chain);
    if (mode === 'single') {
        chain.eq = jest.fn(() => chain);
        chain.maybeSingle = jest.fn(async () => result);
    }
    else {
        chain.eq = jest.fn(async () => result);
    }
    return chain;
}
const tableResults = {};
const singleRowTables = new Set([
    'tracked_habits',
    'app_settings',
    'tasks_records',
    'insights_reflection_timing',
]);
const mockFrom = jest.fn((table) => {
    if (singleRowTables.has(table)) {
        return queryChain({ data: null, error: null }, 'single');
    }
    return queryChain(tableResults[table] ?? { data: [], error: null }, 'list');
});
jest.mock('../supabase/client', () => ({
    getSupabaseClient: () => ({ from: mockFrom }),
}));
function noopApplier(overrides = {}) {
    return {
        getLocalMoodEntries: async () => ({}),
        applyMoodEntries: async () => undefined,
        applyHabitSelections: async () => undefined,
        applyTrackedHabitIds: async () => undefined,
        applyGoalsRecord: async () => undefined,
        applySettings: async () => undefined,
        applyTasksRecord: async () => undefined,
        applyTaskDayItems: async () => undefined,
        applyInsightsTiming: async () => undefined,
        ...overrides,
    };
}
describe('pullCloudDataToLocal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        for (const key of Object.keys(tableResults))
            delete tableResults[key];
        tableResults.mood_entries = { data: [], error: null };
        tableResults.habit_selections = { data: [], error: null };
        tableResults.goals = { data: [], error: null };
        tableResults.goal_progress = { data: [], error: null };
        tableResults.task_day_items = { data: [], error: null };
    });
    it('merges cloud moods with local LWW before applyMoodEntries', async () => {
        tableResults.mood_entries = {
            data: [
                {
                    date: '2026-05-01',
                    mood: 'B',
                    note: 'cloud',
                    created_at_ms: 1,
                    updated_at_ms: 200,
                    deleted_at: null,
                },
                {
                    date: '2026-05-02',
                    mood: 'A',
                    note: 'deleted',
                    created_at_ms: 1,
                    updated_at_ms: 50,
                    deleted_at: '2026-05-01T00:00:00.000Z',
                },
            ],
            error: null,
        };
        const applyMoodEntries = jest.fn(async () => undefined);
        const applier = noopApplier({
            getLocalMoodEntries: async () => ({
                '2026-05-01': {
                    date: '2026-05-01',
                    mood: 'A',
                    note: 'local',
                    createdAt: 1,
                    updatedAt: 100,
                },
                '2026-05-03': {
                    date: '2026-05-03',
                    mood: 'C',
                    note: 'local only',
                    createdAt: 1,
                    updatedAt: 300,
                },
            }),
            applyMoodEntries,
        });
        await pullCloudDataToLocal({ id: 'user-1' }, applier);
        expect(applyMoodEntries).toHaveBeenCalledTimes(1);
        const callArgs = applyMoodEntries.mock.calls[0];
        expect(callArgs[0]['2026-05-01']?.mood).toBe('B');
        expect(callArgs[0]['2026-05-02']).toBeUndefined();
        expect(callArgs[0]['2026-05-03']?.mood).toBe('C');
    });
    it('applies habit selections from cloud rows', async () => {
        tableResults.habit_selections = {
            data: [{ date: '2026-05-01', habit_id: 'workout' }],
            error: null,
        };
        const applyHabitSelections = jest.fn(async () => undefined);
        await pullCloudDataToLocal({ id: 'user-1' }, noopApplier({ applyHabitSelections }));
        expect(applyHabitSelections).toHaveBeenCalledWith({ '2026-05-01': ['workout'] });
    });
});
