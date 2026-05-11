# Moodly Data Contract (Local Persistence + Analytics-Ready)

This document defines the **canonical data contract** for Moodly.
It is written as engineering rules for downstream analytics/ML and future export jobs.

## Persisted storage keys

- **`moodly.entries`**: JSON object map: `{ [date: "YYYY-MM-DD"]: MoodEntry }`
- **`moodly.settings`**: JSON object: `AppSettings`

### Corruption quarantine (automatic)

If a stored value cannot be parsed/validated, Moodly will:

- Copy the raw value to: `moodly.<key>.corrupt.<timestamp>`
- Reset the primary key to a safe default (`{}` for entries; default settings for settings)
- Continue running without crashing

### Persistence invariants (required)

- **Persist-first**: update RAM caches only after AsyncStorage writes succeed.
- **Writes are serialized** per key (prevents lost updates under concurrent saves).
- **UI never touches AsyncStorage** directly; UI imports persistence APIs from `src/storage`.

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
}
```

- **`appearance`**: drives **`AppThemeProvider`** resolution with the OS scheme when `system`.
- **`calendarMoodStyle`**: full-color day fill vs dot under the day number in **`MonthGrid`**.
- **`moodGradeColorStyle`**: **`solid`** uses **`mood`** only; **`gradient`** uses **`mood`**, **`moodGradientMid`**, and **`moodBloomAccent`** (**`#FFB7E5`** at 100%) per grade on a **135°** (`TL→BR`) `LinearGradient` — see `moodGradeBloom.ts` (meaning/order of grades unchanged).
- Source of truth types: `src/types/settings.types.ts`.

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

