/**
 * @fileoverview Opt-in long-running Kairo soak test.
 *
 * Runs under Jest with the AsyncStorage mock, so it exercises Kairo's real
 * storage/domain APIs without touching simulator/device/user data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addGoalProgress, archiveGoal, getGoals, resetGoalsStorageSessionStateForTests, upsertGoal } from '../../data/storage/goalsStorage';
import { addDayTodo, deleteDayTodo, getDayTodosForDate, resetDayTodosStorageSessionStateForTests, setDayTodoDone } from '../../data/storage/dayTodosStorage';
import { generateDueTaskRecurrences, getTasks, resetTasksStorageSessionStateForTests } from '../../data/storage/tasksStorage';
import { fetchMoodCalendarSnapshot } from '../../data/storage/calendarSnapshot';
import { getEntriesSortedDesc, getEntry, getMoodStats, resetEntriesStorageSessionStateForTests, upsertEntry } from '../../data/storage/moodStorage';
import { getSettings, resetSettingsStorageSessionStateForTests, setSettings } from '../../data/storage/settingsStorage';
import { isValidISODateKey } from '../../data/model/entry';
import { computeGoalProgress, sortGoalsForDisplay } from '../../lib/goals';
import { createDayTask } from '../../lib/todos/taskModel';
import type { Goal, MoodEntry, MoodGrade, Task, TaskHistory, TasksRecord } from '../../types';

const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');

jest.setTimeout(2147483647);

const REPORT_PATH = path.join(process.cwd(), 'SOAK_TEST_REPORT.md');
const TASKS_KEY = 'kairo.tasks';
const GOALS_KEY = 'kairo.goals';
const ENTRIES_KEY = 'kairo.entries';
const SLEEP_MS = readIntEnv('SOAK_INTERVAL_MS', 250);
const CHECKPOINT_EVERY = Math.max(1, readIntEnv('SOAK_CHECKPOINT_EVERY', 5));
const MAX_LOOPS = process.env.SOAK_MAX_LOOPS ? Math.max(1, readIntEnv('SOAK_MAX_LOOPS', 1)) : null;
const CLEANUP = process.env.SOAK_CLEANUP === '1';
const SOAK_PROFILE = process.env.SOAK_PROFILE === 'hot-path' ? 'hot-path' : 'full';
const HOT_PATH_ONLY = SOAK_PROFILE === 'hot-path';
const MOODS: readonly MoodGrade[] = ['A+', 'A', 'B', 'C', 'D', 'F'];
const TARGET_GOALS = 100;
const TARGET_TASKS = 1000;
const TARGET_TASK_HISTORY = 5000;
const TARGET_ENTRIES = 365;
const TARGET_RECURRING_TEMPLATES = 12;
const TARGET_GOAL_HISTORY = 5000;

type Metric = { count: number; totalMs: number; maxMs: number; slow: number; kind: 'app' | 'harness' };
type Failure = {
  at: string;
  loop: number;
  action: string;
  message: string;
  memory: MemorySnapshot;
  counts: DataCounts;
  stack?: string;
};
type SlowOperation = { at: string; loop: number; name: string; ms: number };
type MemorySnapshot = {
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  externalMb: number;
};
type DataCounts = {
  entries: number;
  goals: number;
  tasks: number;
  taskHistory: number;
  completedTasks: number;
  archivedGoals: number;
};
type SoakState = {
  startedAt: number;
  loops: number;
  fatal: boolean;
  stopReason: string;
  failures: Failure[];
  slowOperations: SlowOperation[];
  metrics: Record<string, Metric>;
  memory: MemorySnapshot[];
  expectedEntryDates: Set<string>;
  expectedCompletedTaskIds: Set<string>;
  intentionallyDeletedTaskIds: Set<string>;
  expectedArchivedGoalIds: Set<string>;
};

function readIntEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso(): string {
  return new Date().toISOString();
}

function mb(n: number): number {
  return Math.round((n / 1024 / 1024) * 10) / 10;
}

function memorySnapshot(): MemorySnapshot {
  const maybeGc = (globalThis as { gc?: () => void }).gc;
  if (typeof maybeGc === 'function') maybeGc();
  const usage = process.memoryUsage();
  return {
    rssMb: mb(usage.rss),
    heapUsedMb: mb(usage.heapUsed),
    heapTotalMb: mb(usage.heapTotal),
    externalMb: mb(usage.external),
  };
}

function dateKeyFromOffset(offset: number): string {
  const date = new Date(2026, 0, 1);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function measure<T>(state: SoakState, name: string, op: () => Promise<T>, kind: Metric['kind'] = 'app'): Promise<T> {
  const started = Date.now();
  try {
    return await op();
  } finally {
    const ms = Date.now() - started;
    const metric = (state.metrics[name] ||= { count: 0, totalMs: 0, maxMs: 0, slow: 0, kind });
    metric.count += 1;
    metric.totalMs += ms;
    metric.maxMs = Math.max(metric.maxMs, ms);
    if (ms >= 100) {
      metric.slow += 1;
      state.slowOperations.push({ at: nowIso(), loop: state.loops, name, ms });
      state.slowOperations = state.slowOperations.slice(-50);
    }
  }
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  return JSON.parse(raw) as T;
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function counts(entries: Record<string, unknown>, goals: Goal[], tasks: Task[], taskHistory: number): DataCounts {
  return {
    entries: Object.keys(entries).length,
    goals: goals.length,
    tasks: tasks.length,
    taskHistory,
    completedTasks: tasks.filter((task) => task.status === 'completed').length,
    archivedGoals: goals.filter((goal) => goal.status === 'archived').length,
  };
}

async function currentCounts(): Promise<DataCounts> {
  const entries = await readJson<Record<string, unknown>>(ENTRIES_KEY, {});
  const goals = await getGoals();
  const tasks = await getTasks();
  const record = await readJson<TasksRecord>(TASKS_KEY, emptyTasksRecord());
  const taskHistory = Object.values(record.historyByTaskId ?? {}).reduce((sum, history) => sum + history.length, 0);
  return counts(entries, goals, tasks, taskHistory);
}

function emptyTasksRecord(): TasksRecord {
  return {
    version: 1,
    tasksById: {},
    listsById: {},
    tagsById: {},
    historyByTaskId: {},
    migratedLegacyDayTodosAt: Date.now(),
  };
}

function recordFailure(state: SoakState, action: string, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  state.failures.push({
    at: nowIso(),
    loop: state.loops,
    action,
    message: err.message,
    memory: memorySnapshot(),
    counts: {
      entries: 0,
      goals: 0,
      tasks: 0,
      taskHistory: 0,
      completedTasks: 0,
      archivedGoals: 0,
    },
    stack: err.stack,
  });
}

function createState(): SoakState {
  return {
    startedAt: Date.now(),
    loops: 0,
    fatal: false,
    stopReason: 'running',
    failures: [],
    slowOperations: [],
    metrics: {},
    memory: [],
    expectedEntryDates: new Set<string>(),
    expectedCompletedTaskIds: new Set<string>(),
    intentionallyDeletedTaskIds: new Set<string>(),
    expectedArchivedGoalIds: new Set<string>(),
  };
}

async function resetSessionCaches(): Promise<void> {
  resetEntriesStorageSessionStateForTests();
  resetSettingsStorageSessionStateForTests();
  resetDayTodosStorageSessionStateForTests();
  resetTasksStorageSessionStateForTests();
  resetGoalsStorageSessionStateForTests();
}

async function bootstrapSettings(state: SoakState): Promise<void> {
  await measure(state, 'settings.bootstrap', async () => {
    const settings = await getSettings();
    await setSettings({
      ...settings,
      habitsEnabled: true,
      todayGoalsEnabled: true,
      todayTodoEnabled: true,
    });
  });
}

async function ensureGoalPool(state: SoakState, loop: number): Promise<Goal[]> {
  const goals = await measure(state, 'goals.load', getGoals);
  if (goals.length >= TARGET_GOALS) return goals;
  const type = loop % 4 === 0 ? 'project' : loop % 3 === 0 ? 'average' : loop % 2 === 0 ? 'target' : 'habit';
  const created = await measure(state, 'goals.create', () =>
    upsertGoal({
      title: `Soak goal ${String(goals.length + 1).padStart(3, '0')}`,
      type,
      category: 'personal',
      progress: { currentValue: 0, targetValue: type === 'target' ? 25 : 5, unit: type === 'target' ? 'pts' : 'times', frequency: 'daily' },
    })
  );
  return [...goals, created];
}

async function simulateToday(state: SoakState, date: string, loop: number): Promise<void> {
  await measure(state, 'screen.today.load', async () => {
    await Promise.all([getEntry(date), getSettings(), getGoals(), getDayTodosForDate(date)]);
  });

  const entry: MoodEntry = {
    date,
    mood: MOODS[loop % MOODS.length]!,
    note: `Soak note ${loop} for ${date}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await measure(state, 'entry.upsert', () => upsertEntry(entry));
  state.expectedEntryDates.add(date);

  const goals = await ensureGoalPool(state, loop);
  const activeGoals = goals.filter((goal) => goal.status === 'active');
  const targetGoal = activeGoals.find((goal) => goal.type === 'target') ?? activeGoals[0];
  const reversibleGoal = activeGoals[0];
  const goalHistoryCount = goals.reduce((sum, goal) => sum + goal.history.length, 0);
  if (reversibleGoal && goalHistoryCount < TARGET_GOAL_HISTORY) {
    await measure(state, 'goal.complete', () => addGoalProgress(reversibleGoal.id, date, Math.max(1, reversibleGoal.progress.targetValue)));
    await measure(state, 'goal.undoCompletion', () =>
      upsertGoal({
        id: reversibleGoal.id,
        title: reversibleGoal.title,
        type: reversibleGoal.type,
        status: 'active',
        category: reversibleGoal.category,
        progress: { ...reversibleGoal.progress, currentValue: 0 },
        history: reversibleGoal.history,
      })
    );
  }
  if (targetGoal && goalHistoryCount < TARGET_GOAL_HISTORY) {
    await measure(state, 'goal.targetProgress', () => addGoalProgress(targetGoal.id, date, 1));
  }

  const taskCount = (await getTasks()).length;
  const afterAdd = taskCount < TARGET_TASKS ? await measure(state, 'todo.add', () => addDayTodo(date, `Soak task ${loop}`)) : await getDayTodosForDate(date);
  const task = afterAdd[afterAdd.length - 1];
  if (task) {
    await measure(state, 'todo.complete', () => setDayTodoDone(date, task.id, true));
    state.expectedCompletedTaskIds.add(task.id);
    await measure(state, 'todo.undoComplete', () => setDayTodoDone(date, task.id, false));
    state.expectedCompletedTaskIds.delete(task.id);
  }
}

async function simulateGoalsPage(state: SoakState, date: string, loop: number): Promise<void> {
  const goals = await measure(state, 'screen.goals.load', async () => {
    const list = sortGoalsForDisplay(await getGoals());
    list.slice(0, 50).forEach((goal) => computeGoalProgress(goal, date));
    return list;
  });
  if (goals.length === 0) return;
  const editable = goals[loop % goals.length]!;
  await measure(state, 'goal.edit', () =>
    upsertGoal({
      id: editable.id,
      title: editable.title,
      type: editable.type,
      category: editable.category,
      notes: `Edited during soak loop ${loop}`,
      progress: editable.progress,
      history: editable.history,
    })
  );
  if (loop % 7 === 0) {
    const archiveCandidate = goals.find((goal) => goal.status !== 'archived');
    if (archiveCandidate) {
      await measure(state, 'goal.archive', () => archiveGoal(archiveCandidate.id));
      state.expectedArchivedGoalIds.add(archiveCandidate.id);
    }
  }
}

async function simulateTodoPage(state: SoakState, date: string, loop: number): Promise<void> {
  await measure(state, 'screen.todo.load', () => getDayTodosForDate(date));
  if ((await getTasks()).length >= TARGET_TASKS) return;
  const list = await measure(state, 'todo.pageAdd', () => addDayTodo(date, `Todo page task ${loop}`));
  const created = list[list.length - 1];
  if (!created) return;
  await measure(state, 'todo.pageComplete', () => setDayTodoDone(date, created.id, true));
  state.expectedCompletedTaskIds.add(created.id);
  if (loop % 3 === 0) {
    await measure(state, 'todo.pageDelete', () => deleteDayTodo(date, created.id));
    state.expectedCompletedTaskIds.delete(created.id);
    state.intentionallyDeletedTaskIds.add(created.id);
  }
}

async function simulateOtherScreens(state: SoakState, date: string): Promise<void> {
  await measure(state, 'screen.journal.load', getEntriesSortedDesc);
  await measure(state, 'screen.calendar.load', fetchMoodCalendarSnapshot);
  await measure(state, 'screen.settings.load', async () => {
    await Promise.all([getSettings(), getMoodStats()]);
  });
  await measure(state, 'app.reloadState', async () => {
    await resetSessionCaches();
    await Promise.all([getEntry(date), getGoals(), getDayTodosForDate(date), fetchMoodCalendarSnapshot()]);
  }, 'harness');
}

function recurringTask(loop: number, date: string): Task {
  return {
    ...createDayTask({ date, title: `Recurring soak task ${loop}`, sortIndex: loop, id: `soak-recurring-template-${loop}` }),
    source: 'task',
    recurrence: {
      id: `soak-recurrence-${loop}`,
      frequency: loop % 2 === 0 ? 'weekly' : 'monthly',
      interval: 1,
      startDate: date,
      endDate: dateKeyFromOffset(364),
      weekdays: [1, 3, 5],
      lastGeneratedDate: null,
    },
  };
}

async function triggerRecurrenceGeneration(state: SoakState, date: string, loop: number): Promise<void> {
  await measure(state, 'recurrence.generate', async () => {
    const currentTaskCount = (await getTasks()).length;
    const record = await readJson<TasksRecord>(TASKS_KEY, emptyTasksRecord());
    const taskHistoryCount = Object.values(record.historyByTaskId ?? {}).reduce((sum, history) => sum + history.length, 0);
    if (currentTaskCount >= TARGET_TASKS || taskHistoryCount >= TARGET_TASK_HISTORY) return;
    if (Object.keys(record.tasksById).filter((id) => id.startsWith('soak-recurring-template-')).length < TARGET_RECURRING_TEMPLATES && loop % 8 === 0) {
      const template = recurringTask(loop, date);
      record.tasksById[template.id] = template;
      await writeJson(TASKS_KEY, record);
      resetTasksStorageSessionStateForTests();
    }
    await generateDueTaskRecurrences(dateKeyFromOffset(364), 4);
  });
}

async function growDataVolume(state: SoakState, loop: number): Promise<void> {
  const targetEntries = Math.min(TARGET_ENTRIES, loop + 1);
  for (let i = 0; i < Math.min(3, targetEntries); i += 1) {
    const date = dateKeyFromOffset((loop + i) % 365);
    if (state.expectedEntryDates.has(date)) continue;
    await upsertEntry({
      date,
      mood: MOODS[(loop + i) % MOODS.length]!,
      note: `Backfilled soak journal ${date}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    state.expectedEntryDates.add(date);
  }

  const tasks = await getTasks();
  if (tasks.length < TARGET_TASKS) {
    const date = dateKeyFromOffset((loop * 7) % 365);
    for (let i = 0; i < Math.min(2, TARGET_TASKS - tasks.length); i += 1) {
      await addDayTodo(date, `Growth task ${loop}-${i}`);
    }
  }

  const goals = await getGoals();
  if (goals.length < TARGET_GOALS) {
    await ensureGoalPool(state, loop);
  }
}

async function validateData(state: SoakState): Promise<void> {
  const entries = await readJson<Record<string, MoodEntry>>(ENTRIES_KEY, {});
  const goalsRaw = await readJson<{ version: 1; goalsById: Record<string, Goal> }>(GOALS_KEY, { version: 1, goalsById: {} });
  const tasksRaw = await readJson<TasksRecord>(TASKS_KEY, emptyTasksRecord());
  const errors: string[] = [];
  const goalIds = new Set<string>();
  const taskIds = new Set<string>();

  for (const date of state.expectedEntryDates) {
    if (!entries[date]) errors.push(`lost mood/journal entry ${date}`);
  }
  for (const [date, entry] of Object.entries(entries)) {
    if (!isValidISODateKey(date) || entry.date !== date || typeof entry.note !== 'string') errors.push(`invalid entry ${date}`);
  }

  for (const [id, goal] of Object.entries(goalsRaw.goalsById ?? {})) {
    if (goalIds.has(id)) errors.push(`duplicate goal id ${id}`);
    goalIds.add(id);
    if (goal.id !== id || !goal.title || !goal.progress || !Number.isFinite(goal.progress.currentValue)) errors.push(`invalid goal ${id}`);
    for (const history of goal.history ?? []) {
      if (!history.id || !isValidISODateKey(history.date) || !Number.isFinite(history.value)) errors.push(`invalid goal history ${goal.id}:${history.id}`);
    }
  }
  for (const id of state.expectedArchivedGoalIds) {
    const goal = goalsRaw.goalsById[id];
    if (goal && goal.status !== 'archived') errors.push(`archived goal reopened ${id}`);
  }

  for (const [id, task] of Object.entries(tasksRaw.tasksById ?? {})) {
    if (taskIds.has(id)) errors.push(`duplicate task id ${id}`);
    taskIds.add(id);
    if (task.id !== id || !task.title || !['open', 'completed', 'archived'].includes(task.status)) errors.push(`invalid task ${id}`);
    if (task.dueDate && !isValidISODateKey(task.dueDate)) errors.push(`invalid task due date ${id}`);
    for (const subtask of task.subtasks ?? []) {
      if (!subtask.id || !subtask.title || typeof subtask.done !== 'boolean') errors.push(`orphaned/invalid subtask ${id}:${subtask.id}`);
    }
    for (const reminder of task.reminders ?? []) {
      if (!reminder.id || !isValidISODateKey(reminder.date) || !Number.isFinite(reminder.minutesFromMidnight)) errors.push(`orphaned/invalid reminder ${id}:${reminder.id}`);
    }
    if (task.recurrence) {
      const r = task.recurrence;
      if (!r.id || !isValidISODateKey(r.startDate) || (r.endDate != null && !isValidISODateKey(r.endDate))) errors.push(`invalid recurrence ${id}`);
      if (!Number.isFinite(r.interval) || r.interval < 1) errors.push(`invalid recurrence interval ${id}`);
    }
  }
  for (const [taskId, history] of Object.entries(tasksRaw.historyByTaskId ?? {})) {
    if (!tasksRaw.tasksById[taskId]) errors.push(`orphaned task history ${taskId}`);
    for (const event of history as TaskHistory[]) {
      if (!event.id || event.taskId !== taskId || !Number.isFinite(event.at)) errors.push(`invalid task history ${taskId}:${event.id}`);
    }
  }
  for (const id of state.expectedCompletedTaskIds) {
    const task = tasksRaw.tasksById[id];
    if (task && task.status !== 'completed') errors.push(`completed task reopened ${id}`);
  }
  for (const id of state.intentionallyDeletedTaskIds) {
    if (tasksRaw.tasksById[id]) errors.push(`deleted task reappeared ${id}`);
  }

  if (errors.length > 0) {
    throw new Error(errors.slice(0, 20).join('\n'));
  }
}

function renderReport(state: SoakState, status: string, dataCounts: DataCounts): string {
  const runtimeMs = Date.now() - state.startedAt;
  const firstMem = state.memory[0] ?? memorySnapshot();
  const lastMem = state.memory[state.memory.length - 1] ?? firstMem;
  const metricRowsFor = (kind: Metric['kind']) => Object.entries(state.metrics)
    .filter(([, m]) => m.kind === kind)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, m]) => `| ${name} | ${m.count} | ${(m.totalMs / Math.max(1, m.count)).toFixed(1)} | ${m.maxMs} | ${m.slow} |`)
    .join('\n');
  const appMetricRows = metricRowsFor('app');
  const harnessMetricRows = metricRowsFor('harness');
  const slowRows = state.slowOperations.slice(-20).map((op) => `| ${op.at} | ${op.loop} | ${op.name} | ${op.ms} |`).join('\n');
  const failureRows = state.failures.slice(-20).map((f) => `| ${f.at} | ${f.loop} | ${f.action} | ${f.message.replace(/\n/g, '<br>')} |`).join('\n');
  return `# Kairo Soak Test Report

Status: ${status}

## Summary

| Metric | Value |
|---|---:|
| Started | ${new Date(state.startedAt).toISOString()} |
| Runtime minutes | ${(runtimeMs / 60000).toFixed(2)} |
| Total loops completed | ${state.loops} |
| Stop reason | ${state.stopReason} |
| Profile | ${SOAK_PROFILE} |
| Fatal | ${state.fatal ? 'yes' : 'no'} |
| Failures | ${state.failures.length} |
| Slow operations | ${state.slowOperations.length} |

## Data Snapshot

| Store | Count |
|---|---:|
| Mood/journal entries | ${dataCounts.entries} |
| Goals | ${dataCounts.goals} |
| Tasks | ${dataCounts.tasks} |
| Task history records | ${dataCounts.taskHistory} |
| Completed tasks | ${dataCounts.completedTasks} |
| Archived goals | ${dataCounts.archivedGoals} |

## Memory

| Snapshot | RSS MB | Heap Used MB | Heap Total MB | External MB |
|---|---:|---:|---:|---:|
| First | ${firstMem.rssMb} | ${firstMem.heapUsedMb} | ${firstMem.heapTotalMb} | ${firstMem.externalMb} |
| Latest | ${lastMem.rssMb} | ${lastMem.heapUsedMb} | ${lastMem.heapTotalMb} | ${lastMem.externalMb} |
| Growth | ${(lastMem.rssMb - firstMem.rssMb).toFixed(1)} | ${(lastMem.heapUsedMb - firstMem.heapUsedMb).toFixed(1)} | ${(lastMem.heapTotalMb - firstMem.heapTotalMb).toFixed(1)} | ${(lastMem.externalMb - firstMem.externalMb).toFixed(1)} |

## App Hot-Path Timings

| Operation | Count | Avg ms | Max ms | Slow >=100ms |
|---|---:|---:|---:|---:|
${appMetricRows || '| n/a | 0 | 0 | 0 | 0 |'}

## Validation Harness Timings

| Operation | Count | Avg ms | Max ms | Slow >=100ms |
|---|---:|---:|---:|---:|
${harnessMetricRows || '| n/a | 0 | 0 | 0 | 0 |'}

## Recent Slow Operations

| Timestamp | Loop | Operation | ms |
|---|---:|---|---:|
${slowRows || '| n/a | 0 | n/a | 0 |'}

## Recent Failures

| Timestamp | Loop | Action | Message |
|---|---:|---|---|
${failureRows || '| n/a | 0 | n/a | none |'}

## Coverage Notes

- Simulates Today, Goals, Reminders/To-Do, Journal, Calendar, Settings, storage reloads, recurrence generation, and validation checkpoints.
- Uses Jest AsyncStorage mock only. It is safe for overnight local runs and does not mutate real simulator/device app data.
- \`SOAK_PROFILE=hot-path\` skips full validation passes so timings reflect user-facing loads/writes more directly.
- UI render counts and native memory/frame pacing still require a device/E2E harness; this soak runner records screen-load proxy timings through the same storage/domain paths those screens use.

## Recommendations

- Investigate any repeated failures or operations with growing max/average times.
- If RSS or heap grows monotonically across long runs, capture a Node heap snapshot or reproduce with a native E2E harness.
- Before cloud sync or large import/export, keep using this runner with higher loop counts and add SQLite/sharding benchmarks.
`;
}

async function writeReport(state: SoakState, status: string): Promise<void> {
  let dataCounts: DataCounts;
  try {
    dataCounts = await currentCounts();
    for (const failure of state.failures) failure.counts = dataCounts;
  } catch {
    dataCounts = { entries: 0, goals: 0, tasks: 0, taskHistory: 0, completedTasks: 0, archivedGoals: 0 };
  }
  fs.writeFileSync(REPORT_PATH, renderReport(state, status, dataCounts));
}

describe('Kairo long-running soak test', () => {
  it('runs realistic storage/domain loops until stopped', async () => {
    if (process.env.KAIRO_SOAK_RUN !== '1') {
      return;
    }
    const consoleSpies =
      process.env.SOAK_VERBOSE === '1'
        ? []
        : [
            jest.spyOn(console, 'log').mockImplementation(() => undefined),
            jest.spyOn(console, 'warn').mockImplementation(() => undefined),
            jest.spyOn(console, 'error').mockImplementation(() => undefined),
          ];
    const state = createState();
    let stopRequested = false;
    const stop = (reason: string) => {
      state.stopReason = reason;
      stopRequested = true;
    };
    process.once('SIGINT', () => stop('SIGINT'));
    process.once('SIGTERM', () => stop('SIGTERM'));

    await AsyncStorage.clear();
    if (CLEANUP && fs.existsSync(REPORT_PATH)) fs.unlinkSync(REPORT_PATH);
    await bootstrapSettings(state);
    state.memory.push(memorySnapshot());
    await writeReport(state, 'started');

    try {
      while (!stopRequested && (MAX_LOOPS == null || state.loops < MAX_LOOPS)) {
        state.loops += 1;
        const loop = state.loops;
        const date = dateKeyFromOffset(loop % 365);
        try {
          await simulateToday(state, date, loop);
          await triggerRecurrenceGeneration(state, date, loop);
          await simulateGoalsPage(state, date, loop);
          await simulateTodoPage(state, dateKeyFromOffset((loop * 3) % 365), loop);
          await simulateOtherScreens(state, date);
          await growDataVolume(state, loop);
          if (!HOT_PATH_ONLY) await measure(state, 'data.validate', () => validateData(state), 'harness');
        } catch (error) {
          recordFailure(state, 'loop', error);
        }

        if (loop % CHECKPOINT_EVERY === 0) {
          state.memory.push(memorySnapshot());
          await writeReport(state, 'running');
        }
        await sleep(SLEEP_MS);
      }
      if (MAX_LOOPS != null && state.loops >= MAX_LOOPS) state.stopReason = `SOAK_MAX_LOOPS=${MAX_LOOPS}`;
    } finally {
      state.memory.push(memorySnapshot());
      await writeReport(state, state.fatal ? 'fatal' : 'stopped');
      if (CLEANUP) await AsyncStorage.clear();
      consoleSpies.forEach((spy) => spy.mockRestore());
    }
  });
});
