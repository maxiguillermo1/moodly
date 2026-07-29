# Kairo Data Contract (Local Persistence + Analytics-Ready)

**Data safety & recovery:** see [`docs/DATA_SAFETY.md`](../../docs/DATA_SAFETY.md) and [`docs/ARCHITECTURE_STATE.md`](../../docs/ARCHITECTURE_STATE.md).

This document defines the **canonical data contract** for Kairo.
It is written as engineering rules for downstream analytics/ML and future export jobs.

**App release train:** **0.6.0** (Kairo **v0.6**) — see [`docs/CHANGELOG.md`](../../docs/CHANGELOG.md) § Versioning. **Per-key `v` / `version` fields** in JSON blobs (for example habit envelope **`v: 3`**, goals record **`version`**) are **persistence revisions**, independent of app semver.

## Persisted storage keys

- **`kairo.schemaMeta`**: JSON object: `SchemaMeta`
  - `schemaVersion` (integer ≥ 1): local **forward migration** rail; see `src/data/persistence/` and `docs/DATA_ARCHITECTURE.md`.
  - `migratedAt` (optional unix ms): last successful migration stamp.
  - If unreadable, Kairo quarantines the raw value to `kairo.schemaMeta.corrupt.<timestamp>` and treats disk as **pre-schema** until migrations rebuild meta.
- **`kairo.migrationBackup.<from>_to_<to>.<timestamp>`**: JSON envelope `kind: kairo.migrationBackup.v1` with a **`snapshot`** map of raw AsyncStorage values captured **immediately before** applying the migration step `from` → `to`. Used for recovery forensics; not read during normal app operation.
- **`kairo.entries`**: JSON object map: `{ [date: "YYYY-MM-DD"]: MoodEntry }` — **legacy import source** after SQLite migration (see below). New writes go to SQLite when `kairo.entries.backend` is `sqlite`.
- **`kairo.entries.backend`**: `"sqlite"` | absent — set after one-shot import from legacy `kairo.entries` into the local SQLite `mood_entries` table. Test override: `KAIRO_ENTRIES_BACKEND=async|sqlite`.
- **`kairo.settings`**: JSON object: `AppSettings`
- **`kairo.habitSelections`**: versioned JSON envelope **`{ v: 3, selections: { [date: "YYYY-MM-DD"]: HabitId[] }, toggleTotals: {} }`** — **legacy import source** after SQLite migration. New writes go to SQLite when `kairo.habitSelections.backend` is `sqlite`.
- **`kairo.habitSelections.backend`**: `"sqlite"` | absent — set after one-shot import from legacy `kairo.habitSelections` into `habit_selections`.
  - **`selections`** is the **only** source of truth for which habits are “on” for each local calendar day. Keys must pass `isValidISODateKey`; each array is **deduplicated** and stored in **stable catalog order** (`HABIT_IDS`).
  - **`toggleTotals`** is **deprecated** (compatibility only). It is always **`{}`** on read/write and must **never** be used for UI counts or analytics. **Marked-day totals** on the Habits screen are **derived** from `selections` only (count distinct dates per habit). Today/journal habit **extensions intentionally do not** load or display those counts.
  - Legacy **`v: 2`** payloads (with `onCounts`) and unknown future **`v`** values with a recoverable `selections` object forward-migrate to canonical **`v: 3`** on read when persistence is writable.
- **Goals engine rules** (unchanged): **`goalsById[*].history`** is the **source of truth** for progress; `progress.currentValue` is **derived** on read/write via `canonicalizeGoalModel` (`src/lib/goals/goalMath.ts`). Same local calendar day keeps **one** history row (replace semantics; latest `createdAt` wins when merging duplicates). See `docs/AGENTS.md` § Goals and `docs/GOALS_ENGINE.md`.
- **`kairo.trackedHabits`**: JSON array of `HabitId` — which habits are tracked in the UI strip (see `habitTrackingStorage`).
- **`kairo.tasks`**: versioned JSON object: `TasksRecord` — normalized local task/reminder metadata, recurrence templates/history, lists/tags, and migration marker.
- **`kairo.tasks.day.<YYYY-MM-DD>`**: JSON array: `DayTodoItem[]` — hot per-day **Reminders** shard used by Today/Todo day loads and one-day mutations.
- **`kairo.tasks.dayIndex`**: JSON array: `YYYY-MM-DD[]` — index of day shards for aggregate/debug reads.
- **`kairo.dayTodos`**: legacy JSON object map: `{ [date: "YYYY-MM-DD"]: DayTodoItem[] }`. On first task-store read, valid rows migrate into the task metadata record and day shards once. The legacy key is kept only as a migration source / corrupt quarantine target.
- **`kairo.goals`**: versioned JSON object: `GoalsRecord` (**on-disk payload `version` 2** today — independent of app semver **0.6.0**) — **legacy import source** after SQLite migration. New writes go to SQLite when `kairo.goals.backend` is `sqlite`.
- **`kairo.goals.backend`**: `"sqlite"` | absent — set after one-shot import from legacy `kairo.goals` into `goals` + `goal_progress`.
- **`kairo.insights.reflectionTiming`**: JSON `{ schemaVersion: 1, topicLastSurfacedAtMs: Record<string, number> }` — **presentation cooldown bookkeeping only** (not computed insight payloads). See `docs/INSIGHTS.md`.
- **`kairo.demoSeeded` / `kairo.demoSeedVersion`**: dev/demo metadata only; production user data does not depend on these keys.

### Corruption quarantine (automatic)

If a stored value cannot be parsed/validated, Kairo will:

- Copy the raw value to: `kairo.<key>.corrupt.<timestamp>`
- Reset the primary key to a safe default (`{}` for map stores; default settings/tracked habits where applicable)
- Continue running without crashing

### User export / import (Settings)

Settings → **Export My Data** / **Import Data** uses the in-code envelope **`kairo.localExport.v1`** (`src/data/persistence/localExport/kairoLocalExport.ts`): `formatRevision`, `exportedAtMs`, `schemaMetaRaw`, and `kv` (raw `kairo.*` strings). Export merges SQLite snapshots for mood entries, habit selections, and goals into `kv`. Import restores AsyncStorage then re-imports SQLite domains. Repository: `userDataExportRepository`.

### Persistence invariants (required)

- **Persist-first**: update RAM caches only after AsyncStorage writes succeed.
- **Writes are serialized** per key (prevents lost updates under concurrent saves).
- **UI never touches AsyncStorage** directly; UI imports persistence APIs from `src/storage`.
- See **`docs/DATA_ARCHITECTURE.md`** for repositories, `KeyValueStore`, the migration rail, and **SQLite `mood_entries`**.

### SQLite (local relational store — v0.7 foundation)

File: **`kairo.db`** (`expo-sqlite`, WAL mode). Schema rail: `PRAGMA user_version` via `src/data/persistence/sqlite/` (`CURRENT_SQL_SCHEMA_VERSION` = **3**).

| Table | Columns | Notes |
|-------|---------|--------|
| `kairo_meta` | `key`, `value` | Import markers (`entries_imported_from_async_v1`, `habits_imported_from_async_v1`, `goals_imported_from_async_v1`, backend flags). |
| `mood_entries` | `date`, `mood`, `note`, `created_at_ms`, `updated_at_ms` | Primary key `date` (`YYYY-MM-DD`). Indexed by `updated_at_ms` and `substr(date,1,7)`. |
| `habit_selections` | `date`, `habit_id` | Composite PK `(date, habit_id)`. Index on `date`. |
| `goals` | `id`, `payload_json`, `updated_at_ms` | Goal metadata without embedded history. |
| `goal_progress` | `goal_id`, `date`, `value`, `note`, `created_at_ms` | Composite PK `(goal_id, date)`. |

- **Bootstrap**: `ensureLocalPersistenceReady()` runs AsyncStorage migrations, opens SQLite, applies SQL migrations, then idempotent imports for entries, habits, and goals.
- **Hot paths**: storage modules keep session caches + write locks; SQLite backends touch rows (not full-blob rewrites).
- **Corruption**: legacy AsyncStorage JSON quarantine unchanged; SQLite reads validate rows and drop invalid rows (metadata-only logs).

### Calendar loading API (no extra keys)

- **`fetchMoodCalendarSnapshot()`** (`src/data/storage/calendarSnapshot.ts`) reads **`kairo.entries`** (via **`getCalendarEntriesByMonthIndexSnapshot()`** — stable month-map references, no full-record clone on the calendar hot path) and **`kairo.settings`** in one parallel pass. Overlapping inflight reads are **coalesced** (rapid tab switches). Used by **`CalendarScreen`** and **`CalendarView`**. Does **not** introduce new persisted keys.

### Mood / journal read APIs (copy semantics)

| API | When to use | Caller may mutate? |
|------|-------------|-------------------|
| `getAllEntries()` | Full record export, tooling, callers that need owned objects | Yes (defensive copy) |
| `getEntriesSortedDesc()` | Callers that need owned row copies (newest first) | Yes (each row cloned) |
| `getJournalEntriesSortedDescSnapshot()` | **Journal** focus reload / list hot path | **No** — stable cache identity until entries change |
| `getCalendarEntriesByMonthIndexSnapshot()` | Calendar render / `fetchMoodCalendarSnapshot` | **No** — stable month-map refs until affected months change |
| `getAllEntriesWithMonthIndex()` | Legacy callers needing record + index with defensive copies | Yes |
| `fetchMoodCalendarSnapshot()` | Calendar month + year screens | **No** for `byMonthKey` |

**Writes:** `upsertEntry` / `deleteEntry` load the session cache via internal **`loadEntriesCacheIfNeeded()`** inside the write lock (no full-record clone on warm paths). Public read APIs above are unchanged for mutation safety.

## Persisted domain types

### `MoodEntry`

```ts
type MoodGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

interface MoodEntry {
  date: string;      // ISO local date key, "YYYY-MM-DD"
  mood: MoodGrade;   // categorical grade
  note: string;      // user-provided text (trimmed; clamped at boundary)
  createdAt: number; // unix ms (first creation)
  updatedAt: number; // unix ms (last modification)
}
```

### Invariants (required)

- `date` must be a valid local date key in the format `YYYY-MM-DD`
- the storage record key must equal `entry.date`
- `mood` must be one of the valid grades
- `note` is treated as **sensitive** data; do not log it
- `createdAt <= updatedAt`

### `AppSettings`

```ts
type CalendarMoodStyle = 'dot' | 'fill'
type AppearancePreference = 'system' | 'light' | 'dark'
type MoodGradeColorStyle = 'solid' | 'gradient'

interface AppSettings {
  appearance: AppearancePreference
  calendarMoodStyle: CalendarMoodStyle
  moodGradeColorStyle: MoodGradeColorStyle
  /** When true, Today shows habit chips (see `kairo.habitSelections`). */
  habitsEnabled: boolean
  /** When true, Today shows the Goals preview backed by `kairo.goals`. */
  todayGoalsEnabled: boolean
  /** When true, Today shows the **Reminders** extension with per-day task projections (`kairo.tasks`). */
  todayTodoEnabled: boolean
  /** Order of extension slots on Today (permutation of `habits` | `goals` | `todo`). */
  todayExtensionsOrder: ('habits' | 'goals' | 'todo')[]
  /** When true, optional cloud backup onboarding prompt was dismissed. */
  cloudBackupPromptDismissed?: boolean
  /** When true, user skipped cloud sign-in and uses Kairo local-only until they sign in. */
  localOnlyMode?: boolean
}
```

- **`appearance`**: drives **`AppThemeProvider`** resolution with the OS scheme when `system`.
- **`calendarMoodStyle`**: full-color day fill vs dot under the day number in **`MonthGrid`**.
- **`moodGradeColorStyle`**: **`solid`** uses **`mood`** only; **`gradient`** uses **`mood`**, **`moodGradientMid`**, and **`moodBloomAccent`** (**`#FFB7E5`** at 100%) per grade on a **135°** (`TL→BR`) `LinearGradient` — see `moodGradeBloom.ts` (meaning/order of grades unchanged).
- **`habitsEnabled`**: when true, Today shows habit chips; selections persist per day under **`kairo.habitSelections`**. Source of truth: `src/types/settings.types.ts` + `src/lib/constants/habitsCatalog.ts` (habit ids).
- **`todayGoalsEnabled`**: when true, Today shows compact active-goal previews from **`kairo.goals`**.
- **`todayTodoEnabled`**: when true, Today shows **Reminders** with day-filtered tasks from **`kairo.tasks`**.
- **`todayExtensionsOrder`**: visual stack order for visible Today extension slots; enabling a toggle moves that slot to the bottom.

### `DayTodoItem`

Compatibility projection for a day-scoped reminder row. New day-scoped writes persist to `kairo.tasks.day.<YYYY-MM-DD>` shards; `DayTodoItem` remains the UI-facing shape for Today/Calendar/Todo day flows.

```ts
interface DayTodoItem {
  id: string
  title: string
  done: boolean
  createdAt: number
  sortIndex: number
  /**
   * Optional local time-of-day cue: minutes from **local midnight**, `0..1439`.
   * In-app display/overdue styling only — does **not** schedule OS notifications.
   */
  reminderMinutes: number | null
}
```

### `Task`

Normalized task/reminder row. The current UI uses day-scoped projections; the model already supports future Inbox/Upcoming/Lists/recurrence/detail surfaces.

```ts
interface Task {
  id: string
  title: string
  notes: string
  status: 'open' | 'completed' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  listId: string | null
  dueDate: string | null
  reminders: TaskReminder[]
  recurrence: TaskRecurrence | null
  subtasks: TaskSubtask[]
  tagIds: string[]
  sortIndex: number
  createdAt: number
  updatedAt: number
  completedAt: number | null
  archivedAt: number | null
  source: 'dayTodo' | 'task'
}
```

`TasksRecord` also carries `listsById`, `tagsById`, `historyByTaskId`, and `migratedLegacyDayTodosAt`. Legacy `DayTodoItem` ids are migrated into date-scoped task ids (`dayTodo:<date>:<legacyId>`) and day shards so identical legacy ids on different days cannot overwrite each other. Recurrence generation is bounded and persists `lastGeneratedDate` to avoid duplicate occurrences after restart.

### `Goal`

Local-first progress model. Today shows compact previews; the full Goals screen owns creation, progress, completion, and archive behavior.

```ts
type GoalType = 'habit' | 'target' | 'average' | 'project'

interface Goal {
  id: string
  type: GoalType
  status: 'active' | 'completed' | 'archived'
  title: string
  category: GoalCategory
  customCategory: string | null
  accentColor: string
  progress: GoalProgress
  reminder: GoalReminder | null
  milestones: GoalMilestone[]
  history: GoalHistory[]
  notes: string
  createdAt: number
  updatedAt: number
  completedAt: number | null
  archivedAt: number | null
}
```

Goal writes are normalized at the storage boundary: invalid local date keys and non-finite progress values are rejected, notes/labels are bounded, and very long history/milestone arrays are capped for current single-blob storage safety.

Goal progress logging is idempotent per `goalId + date`: an existing same-day log may update its note, but it must not increase progress again. Paused goals (`status: 'archived'`) reject hidden progress writes. List/Today rendering should use lightweight goal summaries instead of cloning full histories.

## Validated vs raw vs derived layers

- **Raw persisted**: untrusted JSON from AsyncStorage.
- **Validated domain**: runtime-validated, normalized objects safe for analytics/ML.
- **Derived analytics**: deterministic, pure outputs (daily series, aggregates, trends).

## AI/ML readiness conventions (design)

- **Numeric mood mapping**: `A+→5, A→4, B→3, C→2, D→1, F→0` (monotonic “better→higher”)
- **Missing days**: derived datasets can optionally fill gaps with `hasEntry=false` rows
- **Embeddings readiness**:
  - notes are normalized (trim + whitespace collapse)
  - chunking strategy: split by sentences and cap chunk length (e.g. 256–512 chars) (future)
- **Determinism**:
  - all selectors return stable ordering
  - all aggregations are reproducible from the same source record

