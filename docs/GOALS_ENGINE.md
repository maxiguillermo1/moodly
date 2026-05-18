# Goals engine (local-first)

This note complements **`docs/AGENTS.md`** § Goals — it is the **technical contract** for the progress engine.

## Product shape

- **Goals** are **long-horizon tracking** (targets, streaks, optional day-length). They are **not** the Habits chip strip; Habits use `moodly.habitSelections`.
- **`GoalsScreen`** is the full **create / log / manage** hub. **Today** (`TodayGoalsExtension`) is **summary-only**: it calls **`getTodayGoalSummaries`**, shows percent + `completedToday`, and **deep-links** to `Goals` with `{ date }`. It must not mutate goal state.

## Source of truth

- **`GoalHistory`** rows (local **`YYYY-MM-DD`** `date`, `value ≥ 0`, `note`, `createdAt`) are canonical.
- **`progress.currentValue`** is **always derived** from merged history + **`Goal.type`** (`canonicalizeGoalModel`). Persisted `currentValue` on disk may be stale; loaders and writes reconcile it.

## Same-day logging

- **Rule**: **replace** the row for that calendar day (no cumulative “stack” of multiple rows per day). When the user logs again, **`createdAt`** updates so **merge** picks the latest row if duplicates ever appear.
- **Idempotency**: `addGoalProgress` returns early (no disk write) when **value + note** match the existing row for that day.

## Lifecycle

| `status`   | Appears in Today active previews | New `addGoalProgress` |
|------------|----------------------------------|------------------------|
| `active`   | yes                              | allowed                |
| `completed`| no                               | rejected (no-op clone) |
| `archived` | no                               | rejected (no-op clone) |

- **`deleteGoal`**: removes the goal from `goalsById` (destructive).
- **`completeGoal`**: marks **`active` → `completed`** with `completedAt` set; preserves history.

## Storage

- Key: **`moodly.goals`**. Record: **`GoalsRecord`** with **`version: 2`** (`GOALS_RECORD_VERSION` in `goalsStorage.ts`) — this is the **on-disk goals payload revision**, not the Moodly app marketing version.
- **Goals disk format v1 → v2**: on first read of a v1 payload, a **`moodly.goals.migrate_backup.<timestamp>`** copy of the raw JSON is stored, then the canonical v2 record is written. Safe to run repeatedly (idempotent).
- **Corrupt JSON**: quarantine to `moodly.goals.corrupt.<timestamp>` and reset to an empty safe record (see `goalsStorage.ts`).

## APIs (repository)

`getGoals`, `upsertGoal`, `addGoalProgress`, `archiveGoal`, `completeGoal`, `deleteGoal`, plus read-optimized **`getGoalSummaries`** / **`getTodayGoalSummaries`**.

## Tests

- Pure math: `src/lib/goals/goalMath.test.ts`
- Storage + migration: `src/data/storage/goalsStorage.test.ts`
- Today contract: `src/components/todayExtensions/TodayGoalsExtension.test.tsx` (uses `eslint-disable no-restricted-imports` to spy the same `goalsStorage` binding the UI resolves through repositories)
