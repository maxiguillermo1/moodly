# Scalability index (Moodly)

**Purpose:** one-page entry to **how Moodly stays fast and safe as data grows**. Deep rules and product guardrails live elsewhere — this file only **routes** you there.

| Topic | Read this |
|--------|-----------|
| Product stance (calm UX vs feature density, future sync/AI guardrails) | [`AGENTS.md`](./AGENTS.md) § Data, scale, and future evolution; § Moodly identity |
| Persistence layers, keys, repository swap for DB/sync | [`DATA_ARCHITECTURE.md`](./DATA_ARCHITECTURE.md) |
| Current keys, write locks, shard layout, test map | [`ARCHITECTURE_STATE.md`](./ARCHITECTURE_STATE.md), [`../src/data/DATA_CONTRACT.md`](../src/data/DATA_CONTRACT.md) |
| Scroll / list / calendar hot paths | [`PERFORMANCE.md`](./PERFORMANCE.md), [`perf-calendar.md`](./perf-calendar.md), [`PERFORMANCE_BENCHMARKS.md`](./PERFORMANCE_BENCHMARKS.md) |
| Long-run storage + harness | [`TESTING.md`](./TESTING.md) (`test:storage-stress`, `test:soak`), [`SOAK_TEST_REPORT.md`](../SOAK_TEST_REPORT.md) if present |
| Time-ordered technical bets (SQLite, export, AI) | [`ROADMAP.md`](./ROADMAP.md) |

## Implemented scale levers (cheat sheet)

- **Reminders day path:** `moodly.tasks.day.<YYYY-MM-DD>` + `moodly.tasks.dayIndex` — touch **one day** at a time for Today/Todo hot paths (`tasksStorage.ts`).
- **Task metadata / recurrence:** `moodly.tasks` — bounded recurrence generation (`lastGeneratedDate`, caps in code/tests).
- **Goals:** single `moodly.goals` record with **history tail cap** and **`getGoalSummaries` / `getTodayGoalSummaries`** for list/Today previews (`goalsStorage.ts`).
- **Mood entries:** `moodly.entries` + calendar snapshot read path — avoid extra full scans when changing calendar load (`calendarSnapshot`, `moodStorage`).
- **UI state vs disk:** no global store; focus reloads + defensive copies from storage — see [`architecture.md`](./architecture.md).

## When you change something “big”

1. Identify **read/write cardinality** (per day vs whole account vs all time).
2. If cardinality is **O(all user data)** on a hot path, **stop** — shard, index, summarize, or defer (match existing patterns above).
3. Add or extend **tests** (`DATA_CONTRACT`, storage tests, `test:storage-stress`); for loops touching multiple subsystems, consider a **bounded soak** (`TESTING.md`).
4. Update **`DATA_ARCHITECTURE.md`** / **`DATA_CONTRACT.md`** / **`ARCHITECTURE_STATE.md`** if keys, caps, or migration story changed.

For **feature wiring** (what touches what), see [`FEATURES.md`](./FEATURES.md).
