/**
 * @fileoverview Pull Supabase Postgres data into local SQLite/AsyncStorage cache.
 * @module cloud/sync/cloudPull
 */
import { isHabitId } from '../../lib/constants/habitsCatalog';
import { isValidISODateKey } from '../../data/model/entry';
import { getSupabaseClient } from '../supabase/client';
import { mergeMoodEntries } from './moodMerge';
function parseCloudMoods(rows) {
    const cloudMoods = {};
    for (const row of rows ?? []) {
        if (row.deleted_at)
            continue;
        if (!isValidISODateKey(row.date))
            continue;
        cloudMoods[row.date] = {
            date: row.date,
            mood: row.mood,
            note: row.note ?? '',
            createdAt: row.created_at_ms,
            updatedAt: row.updated_at_ms,
        };
    }
    return cloudMoods;
}
function parseHabitSelections(rows) {
    let _a;
    const selections = {};
    for (const row of rows ?? []) {
        if (!isValidISODateKey(row.date) || !isHabitId(row.habit_id))
            continue;
        (selections[_a = row.date] || (selections[_a] = [])).push(row.habit_id);
    }
    return selections;
}
function buildGoalsRecord(goalRows, progressRows) {
    const progressByGoal = new Map();
    for (const row of progressRows ?? []) {
        const list = progressByGoal.get(row.goal_id) ?? [];
        list.push(row);
        progressByGoal.set(row.goal_id, list);
    }
    const goalsById = {};
    for (const row of goalRows ?? []) {
        const base = row.payload_json;
        if (!base?.id)
            continue;
        const history = (progressByGoal.get(row.id) ?? []).map((p) => ({
            id: `${p.goal_id}:${p.date}`,
            date: p.date,
            value: p.value,
            note: p.note ?? '',
            createdAt: p.created_at_ms,
        }));
        goalsById[row.id] = { ...base, history };
    }
    return goalsById;
}
export async function pullCloudDataToLocal(user, applier) {
    const client = getSupabaseClient();
    if (!client)
        throw new Error('Supabase client unavailable');
    const userId = user.id;
    const pulledAtMs = Date.now();
    const [moodResult, habitResult, trackedResult, goalResult, progressResult, settingsResult, tasksResult, dayResult, insightsResult,] = await Promise.all([
        client.from('mood_entries').select('date,mood,note,created_at_ms,updated_at_ms,deleted_at').eq('user_id', userId),
        client.from('habit_selections').select('date,habit_id').eq('user_id', userId),
        client.from('tracked_habits').select('habit_ids').eq('user_id', userId).maybeSingle(),
        client.from('goals').select('id,payload_json,updated_at_ms').eq('user_id', userId),
        client.from('goal_progress').select('goal_id,date,value,note,created_at_ms,updated_at_ms').eq('user_id', userId),
        client.from('app_settings').select('settings_json').eq('user_id', userId).maybeSingle(),
        client.from('tasks_records').select('payload_json').eq('user_id', userId).maybeSingle(),
        client.from('task_day_items').select('date,items_json').eq('user_id', userId),
        client.from('insights_reflection_timing').select('payload_json').eq('user_id', userId).maybeSingle(),
    ]);
    if (moodResult.error)
        throw moodResult.error;
    if (habitResult.error)
        throw habitResult.error;
    if (goalResult.error)
        throw goalResult.error;
    if (progressResult.error)
        throw progressResult.error;
    const cloudMoods = parseCloudMoods(moodResult.data);
    const localMoods = await applier.getLocalMoodEntries();
    await applier.applyMoodEntries(mergeMoodEntries(localMoods, cloudMoods));
    await applier.applyHabitSelections(parseHabitSelections(habitResult.data));
    const trackedRow = trackedResult.data;
    if (trackedRow?.habit_ids && Array.isArray(trackedRow.habit_ids)) {
        const ids = trackedRow.habit_ids.filter((id) => typeof id === 'string' && isHabitId(id));
        await applier.applyTrackedHabitIds(ids);
    }
    const goalsById = buildGoalsRecord(goalResult.data, progressResult.data);
    await applier.applyGoalsRecord({ version: 2, goalsById });
    const settingsRow = settingsResult.data;
    if (settingsRow?.settings_json && typeof settingsRow.settings_json === 'object') {
        await applier.applySettings(settingsRow.settings_json);
    }
    const tasksRow = tasksResult.data;
    if (tasksRow?.payload_json && typeof tasksRow.payload_json === 'object') {
        await applier.applyTasksRecord(tasksRow.payload_json);
    }
    for (const row of (dayResult.data ?? [])) {
        if (!isValidISODateKey(row.date))
            continue;
        const items = Array.isArray(row.items_json) ? row.items_json : [];
        await applier.applyTaskDayItems(row.date, items);
    }
    const insightsRow = insightsResult.data;
    if (insightsRow?.payload_json && typeof insightsRow.payload_json === 'object') {
        await applier.applyInsightsTiming(insightsRow.payload_json);
    }
    return {
        pulledAtMs,
        moodCount: Object.keys(cloudMoods).length,
        habitRowCount: habitResult.data?.length ?? 0,
        goalCount: Object.keys(goalsById).length,
    };
}
