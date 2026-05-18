# Daily Activity — composed read model

**Mental model:** everything meaningful about a **local calendar day** can be read in one place, without creating a second source of truth — so users (and engines) can relate **mood colors on the timeline** to **lightweight same-day context** (habits, goals, reminders) when they choose to zoom in.

**Product fit:** Daily Activity **supports interpretation of the emotional map**; it must never become the product’s primary identity or a productivity dashboard.

**Engineering model:** a **read-only** projection over existing domain stores. Writes stay in `entriesRepository`, `extensionsRepository`, `goalsRepository`, `tasksRepository`, etc.

## Source of truth vs derived

| Layer | Role |
|--------|------|
| `moodly.entries`, `moodly.habitSelections`, `moodly.goals`, `moodly.tasks` + day shards, `moodly.trackedHabits` | **Source of truth** — persisted, validated in `*Storage.ts` |
| `dailyActivityRepository` (`src/data/repositories/dailyActivityRepository.ts`) | **Derived read model** — composes `DayActivity` for a key or range; never mutates stores |
| `DayActivity` DTO (`src/types/dailyActivity.types.ts`) | **UI-ready snapshot** — small sections (`mood`, `journal`, `habits`, `goals`, `reminders`, `calendar`, `summary`, `metadata`) |

Comments in the repository file mark **derived** fields. Echoed natural keys (`date`) mirror the query argument.

## Public API

Import from **`src/storage`** (same as other repositories):

- `getDayActivity(date: LocalDateKey): Promise<DayActivity>`
- `getDayActivityRange(startDate, endDate): Promise<Record<LocalDateKey, DayActivity>>`
- `getTodayActivity(): Promise<DayActivity>` — delegates to `getDayActivity(getToday())`
- `dailyActivityRepository` object + `enumerateLocalDateRangeInclusive`, `MAX_DAILY_ACTIVITY_RANGE_DAYS`, `emptyDayActivity` (for tests / guards)

## Local date keys

- **Only** `YYYY-MM-DD` strings validated with `isValidISODateKey` (`src/data/model/entry.ts`).
- **Never** derive day identity from `toISOString().slice(0, 10)` (timezone drift).
- Invalid keys → **safe empty** `DayActivity` with `metadata.warnings` (e.g. `invalid_date`, `invalid_range`).

## Performance expectations

- **Single day:** parallel reads across domains (`Promise.all`); suitable for Today-style dashboards.
- **Range:** bounded by `MAX_DAILY_ACTIVITY_RANGE_DAYS` (4000). One `getAllEntries()`, one habit-selection snapshot, one `getGoals()`, one `getTrackedHabitIds()`, then **batched** `getTasksForDate` per day (I/O already sharded by day). **Not** N full-store reloads for mood/habits/goals.
- **Goals:** active goals capped per day (`MAX_ACTIVE_GOALS_PER_DAY` in repository); progress via `canonicalizeGoalModel` + `computeGoalProgress` (same engine as Goals UI).

## Data safety

- Compose errors → empty sections + warning (`compose_failed`, `range_compose_failed`); **no throw** into UI.
- Malformed partial rows are tolerated where sections use defensive coercions (e.g. note preview, `updatedAt`).

## Correct vs incorrect usage

**Do**

- Call `getDayActivity` / `getTodayActivity` when you need a **single** cross-facet snapshot (e.g. future Today internals, debugging).
- Call `getDayActivityRange` for **batch** month summaries **after** confirming day count is within cap.
- Keep **writes** on domain repositories / storage APIs behind `src/storage`.

**Do not**

- Persist `DayActivity` JSON as a new store.
- Mutate returned objects expecting stores to update (returned objects may be recreated per call).
- Import `src/data/storage/*` from UI to “reimplement” Daily Activity — use this repository or domain APIs.

## Tests

See `src/data/repositories/dailyActivityRepository.test.ts` — empty facets, single-facet days, full day, invalid date/range, range truncation, batching (`getAllEntries` once), read-only (no `upsertEntry`), today key alignment.

## Future extensions

New per-day facets should add a **persisted** envelope under `moodly.*`, validate in storage, expose read/write through a **domain repository**, then **extend** `DayActivity` and `buildDayActivityCore` / range batch path without duplicating summary math in screens.
