# Moodly Data Contract (Local Persistence + Analytics-Ready)

**Data safety & recovery:** see [`docs/DATA_SAFETY.md`](../../docs/DATA_SAFETY.md) and [`docs/ARCHITECTURE_STATE.md`](../../docs/ARCHITECTURE_STATE.md).

This document defines the **canonical data contract** for Moodly.
It is written as engineering rules for downstream analytics/ML and future export jobs.

**App release train:** **0.5.0** (Moodly **v0.5**) — see [`docs/CHANGELOG.md`](../../docs/CHANGELOG.md) § Versioning. **Per-key `v` / `version` fields** in JSON blobs (for example habit envelope **`v: 3`**, goals record **`version`**) are **persistence revisions**, independent of app semver.

## Persisted storage keys

- **`moodly.schemaMeta`**: JSON object: `SchemaMeta`
  - `schemaVersion` (integer ≥ 1): local **forward migration** rail; see `src/data/persistence/` and `docs/DATA_ARCHITECTURE.md`.
  - `migratedAt` (optional unix ms): last successful migration stamp.
  - If unreadable, Moodly quarantines the raw value to `moodly.schemaMeta.corrupt.<timestamp>` and treats disk as **pre-schema** until migrations rebuild meta.
- **`moodly.migrationBackup.<from>_to_<to>.<timestamp>`**: JSON envelope `kind: moodly.migrationBackup.v1` with a **`snapshot`** map of raw AsyncStorage values captured **immediately before** applying the migration step `from` → `to`. Used for recovery forensics; not read during normal app operation.
- **`moodly.entries`**: JSON object map: `{ [date: "YYYY-MM-DD"]: MoodEntry }`
- **`moodly.settings`**: JSON object: `AppSettings`
- **`moodly.habitSelections`**: versioned JSON envelope **`{ v: 3, selections: { [date: "YYYY-MM-DD"]: HabitId[] }, toggleTotals: {} }`**.
  - **`selections`** is the **only** source of truth for which habits are “on” for each local calendar day. Keys must pass `isValidISODateKey`; each array is **deduplicated** and stored in **stable catalog order** (`HABIT_IDS`).
  - **`toggleTotals`** is **deprecated** (compatibility only). It is always **`{}`** on read/write and must **never** be used for UI counts or analytics. **Marked-day totals** on the Habits screen are **derived** from `selections` only (count distinct dates per habit). Today/journal habit **extensions intentionally do not** load or display those counts.
  - Legacy **`v: 2`** payloads (with `onCounts`) and unknown future **`v`** values with a recoverable `selections` object forward-migrate to canonical **`v: 3`** on read when persistence is writable.
- **`moodly.trackedHabits`**: JSON array of `HabitId` — which habits are tracked in the UI strip (see `habitTrackingStorage`).
- **`moodly.tasks`**: versioned JSON object: `TasksRecord` — normalized local task/reminder metadata, recurrence templates/history, lists/tags, and migration marker.
- **`moodly.tasks.day.<YYYY-MM-DD>`**: JSON array: `DayTodoItem[]` — hot per-day **Reminders** shard used by Today/Todo day loads and one-day mutations.
- **`moodly.tasks.dayIndex`**: JSON array: `YYYY-MM-DD[]` — index of day shards for aggregate/debug reads.
- **`moodly.dayTodos`**: legacy JSON object map: `{ [date: "YYYY-MM-DD"]: DayTodoItem[] }`. On first task-store read, valid rows migrate into the task metadata record and day shards once. The legacy key is kept only as a migration source / corrupt quarantine target.
- **`moodly.goals`**: versioned JSON object: `GoalsRecord` (**on-disk payload `version` 2** today — independent of app semver **0.5.0**) — local goal engine. **`goalsById[*].history`** is the **source of truth** for progress; `progress.currentValue` is **derived** on read/write via `canonicalizeGoalModel` (`src/lib/goals/goalMath.ts`). Same local calendar day keeps **one** history row (replace semantics; latest `createdAt` wins when merging duplicates). See `docs/AGENTS.md` § Goals and `docs/GOALS_ENGINE.md`.
- **`moodly.insights.reflectionTiming`**: JSON `{ schemaVersion: 1, topicLastSurfacedAtMs: Record<string, number> }` — **presentation cooldown bookkeeping only** (not computed insight payloads). See `docs/INSIGHTS.md`.
- **`moodly.demoSeeded` / `moodly.demoSeedVersion`**: dev/demo metadata only; production user data does not depend on these keys.

### Corruption quarantine (automatic)

If a stored value cannot be parsed/validated, Moodly will:

- Copy the raw value to: `moodly.<key>.corrupt.<timestamp>`
- Reset the primary key to a safe default (`{}` for map stores; default settings/tracked habits where applicable)
- Continue running without crashing

### Internal full export (no persisted key)

The in-code envelope **`moodly.localExport.v1`** (`src/data/persistence/localExport/moodlyLocalExport.ts`) is a **portable JSON document** for tools/tests: `formatRevision`, `exportedAtMs`, `schemaMetaRaw`, and `kv` (raw `moodly.*` strings). It is **not** stored under a fixed AsyncStorage key by default; callers serialize to file/share when product adds UX.

### Persistence invariants (required)

- **Persist-first**: update RAM caches only after AsyncStorage writes succeed.
- **Writes are serialized** per key (prevents lost updates under concurrent saves).
- **UI never touches AsyncStorage** directly; UI imports persistence APIs from `src/storage`.
- See **`docs/DATA_ARCHITECTURE.md`** for repositories, `KeyValueStore`, and the migration rail.

### Calendar loading API (no extra keys)

- **`fetchMoodCalendarSnapshot()`** (`src/data/storage/calendarSnapshot.ts`) reads **`moodly.entries`** (via the month-grouped index from `getAllEntriesWithMonthIndex`) and **`moodly.settings`** in one parallel pass for calendar screens. It does **not** introduce new persisted keys.

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
  /** When true, Today shows habit chips (see `moodly.habitSelections`). */
  habitsEnabled: boolean
  /** When true, Today shows the Goals preview backed by `moodly.goals`. */
  todayGoalsEnabled: boolean
  /** When true, Today shows the **Reminders** extension with per-day task projections (`moodly.tasks`). */
  todayTodoEnabled: boolean
  /** Order of extension slots on Today (permutation of `habits` | `goals` | `todo`). */
  todayExtensionsOrder: ('habits' | 'goals' | 'todo')[]
}
```

- **`appearance`**: drives **`AppThemeProvider`** resolution with the OS scheme when `system`.
- **`calendarMoodStyle`**: full-color day fill vs dot under the day number in **`MonthGrid`**.
- **`moodGradeColorStyle`**: **`solid`** uses **`mood`** only; **`gradient`** uses **`mood`**, **`moodGradientMid`**, and **`moodBloomAccent`** (**`#FFB7E5`** at 100%) per grade on a **135°** (`TL→BR`) `LinearGradient` — see `moodGradeBloom.ts` (meaning/order of grades unchanged).
- **`habitsEnabled`**: when true, Today shows habit chips; selections persist per day under **`moodly.habitSelections`**. Source of truth: `src/types/settings.types.ts` + `src/lib/constants/habitsCatalog.ts` (habit ids).
- **`todayGoalsEnabled`**: when true, Today shows compact active-goal previews from **`moodly.goals`**.
- **`todayTodoEnabled`**: when true, Today shows **Reminders** with day-filtered tasks from **`moodly.tasks`**.
- **`todayExtensionsOrder`**: visual stack order for visible Today extension slots; enabling a toggle moves that slot to the bottom.

### `DayTodoItem`

Compatibility projection for a day-scoped reminder row. New day-scoped writes persist to `moodly.tasks.day.<YYYY-MM-DD>` shards; `DayTodoItem` remains the UI-facing shape for Today/Calendar/Todo day flows.

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

