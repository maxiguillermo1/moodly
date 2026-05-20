# Architecture state (data & persistence) — snapshot

This document is a **point-in-time summary** for audits and handoffs. Canonical detail lives in [`DATA_CONTRACT.md`](../src/data/DATA_CONTRACT.md), [`DATA_SAFETY.md`](./DATA_SAFETY.md), and [`DATA_ARCHITECTURE.md`](./DATA_ARCHITECTURE.md).

## App & local schema

| Surface | Value | Notes |
|---------|--------|------|
| npm `package.json` / `app.json` / `APP_RELEASE_VERSION` | `0.6.0` | App **release train** (semver); not `CURRENT_SCHEMA_VERSION` nor per-blob JSON revision fields. |
| Local persistence **schema version** | **`1`** (`CURRENT_SCHEMA_VERSION`) | `src/data/persistence/schemaConstants.ts` |
| Schema stamp key | `kairo.schemaMeta` | Written by migration runner after forward steps |

**Bump schema version when:** renaming keys, changing persisted JSON shape in a breaking way, or requiring a one-time transform of existing user data. Append a migration; document in `DATA_ARCHITECTURE.md` and `DATA_SAFETY.md`.

## Layering (data path)

```
UI / hooks
    → src/storage (public façade)
        → src/data/repositories (domain entrypoints)
            → src/data/storage/* (AsyncStorage + caches + locks + validation)
                → src/data/persistence (bootstrap, KeyValueStore, migrations)
```

- **Single I/O injection point for tests:** `src/data/storage/asyncStorage.ts` + `storageFaultInjection.ts`.
- **Migrations** run once per cold boot path via `ensureLocalPersistenceReady()` before payload reads.
- **Write safety after bootstrap failure:** storage writes assert persistence is writable before committing, so a failed migration or newer on-disk schema cannot be overwritten by this app version.

## Repositories (composition)

| Repository | Backing modules | Responsibility |
|--------------|-----------------|------------------|
| `entriesRepository` | `moodStorage` | Mood + journal rows (`kairo.entries`). |
| `settingsRepository` | `settingsStorage` | `AppSettings` + extension visibility/order. |
| `extensionsRepository` | habit selections, tracking, day Reminders APIs | Per-day extension **values** (namespaced API). |
| `tasksRepository` | `tasksStorage`, day Reminder shards | Normalized task metadata, recurrence, and day-scoped Reminder compatibility APIs. |
| `goalsRepository` | `goalsStorage` | Goals CRUD, idempotent daily progress logging, paused/delete flows, lightweight summaries. |
| `calendarSnapshotRepository` | `calendarSnapshot` | Read-optimized calendar snapshot. |
| `sessionRepository` | `sessionStore`, `demoSeed` | Warmup / dev seed. |

## Date-key standard

- **One standard:** `YYYY-MM-DD` local calendar day.
- **Validation:** `isValidLocalCalendarDayKey` (`lib/utils/date.ts`) and `isValidISODateKey` (`data/model/entry.ts`, delegates to the same semantics).
- **ESLint:** Forbids `toISOString().slice` for day identity (`eslint.config.cjs`).

## Write serialization (no lost updates)

| Store | Mechanism |
|-------|-----------|
| `kairo.entries` | `withEntriesWriteLock` |
| `kairo.settings` | `withSettingsWriteLock`; read-modify-write happens inside the lock |
| Habits / Reminders / tracked | Per-module `writeTail` queue; bootstrap before first-write paths |
| Goals | `writeTail` queue; full reads clone records; summary reads avoid full history clones |

Persistence updates RAM caches **after** successful `setItem`.

Public settings, entry, month-index, mood-stats, goal, and day Reminder reads return defensive copies so callers cannot mutate session caches during long app sessions.
Calendar render snapshots are the exception: they use stable read-only month-map references for render invalidation and are updated copy-on-write after entry mutations.

## Hot storage shape

| Store | Current shape | Hot-path note |
|-------|---------------|---------------|
| `kairo.tasks.day.<YYYY-MM-DD>` | `DayTodoItem[]` | Today/Todo day reads and mutations touch only the active day shard. |
| `kairo.tasks.dayIndex` | `YYYY-MM-DD[]` | Lets aggregate/debug reads reconstruct day-sharded Reminder tasks. |
| `kairo.tasks` | `TasksRecord` | Metadata, recurrence templates/history, lists/tags, and legacy migration marker. |
| `kairo.goals` | `GoalsRecord` | Single normalized record; list/Today use lightweight summary selectors. |

## Corruption & recovery

- Parse failures → safe defaults / `{}` / dropped invalid rows.
- Backup corrupt blob → `kairo.<key>.corrupt.<timestamp>`.
- Transient migration/bootstrap failures are retried on the next storage entrypoint; writes remain blocked until bootstrap succeeds.
- Disk schema newer than the app logs and fails bootstrap rather than downgrading or writing over future data.
- **No note content** in production logs.

See § “Corruption quarantine” in `DATA_CONTRACT.md`.

## Tests touching data integrity

| Area | Tests (examples) |
|------|------------------|
| Mood entries | `moodStorage.test.ts`, `journalPersistence.test.ts`, `entry.test.ts` |
| Settings | `settingsStorage.test.ts` |
| Extensions toggle | `extensionsPersistence.test.ts` |
| Malformed disk | `moodStorage.test.ts`, `settingsStorage.test.ts`, `dayTodosStorage.test.ts`, `extensionsPersistence.test.ts`, `habitTrackingStorage.test.ts`, `persistence.test.ts` |
| Migrations | `persistence.test.ts` |
| Calendar params / DST edges | `routeParams.test.ts`, `date.test.ts` |
| Rapid tap guards | `latestOnly.test.ts`, `useCalendarDayPress` + date validation |
| Extension registry / hidden state | `dayExtensionRegistry.test.ts`, `extensionsPersistence.test.ts` |
| Cache immutability | `moodStorage.test.ts`, `settingsStorage.test.ts` |
| Dense extension preservation | `dayTodosStorage.test.ts` |
| Goals/tasks scale paths | `goalsStorage.test.ts`, `tasksStorage.test.ts`, `soak.test.ts` |

## Manual smoke (data)

See **§ Manual smoke** in [`DATA_SAFETY.md`](./DATA_SAFETY.md).

## Changelog of this document

- **2026-05:** Initial snapshot: schema v1, repository layout, date-key unification, write locks, DATA_SAFETY cross-links.
- **2026-05 release prep:** Settings update lock tightened, extension corruption quarantine added, bootstrap retries documented.
- **2026-05 foundation hardening:** Bootstrap failures now block writes, future disk schemas are preserved, calendar date-route restoration is covered, and extension hidden-state persistence is tested.
- **2026-05 deep refinement:** Route dates now win consistently, route replay cannot restore stale calendar selection, year view recenters for out-of-range route years, cache reads return defensive copies, and lifecycle timers/microtasks are guarded.
- **2026-05 remaining-concerns pass:** Month-index/todo cache exposure closed, warmed derived-cache mutation paths tested, calendar frame/scroll retries cancellable or guarded, global scroll interaction state resets on blur, and CI/local release validation share `npm run validate:release`.
- **2026-05 final readiness pass:** Calendar focus reloads keep stable month-map references, timeline virtualizer sizing uses viewport height, deferred window extension is cancellable, and Habits screen async loads/writes are mounted/focus guarded.
- **2026-05 zero-compromise pass:** Data/storage no longer imports the React-facing perf barrel, extension caches ignore stale cold-load results after newer writes, day-todo writes reuse warmed records, theme hydration ignores stale initial settings after user mutations, and Journal avoids no-op focus reload state replacement.
- **2026-05 App Store/storage-scale pass:** Day Reminders moved to `kairo.tasks.day.<YYYY-MM-DD>` shards, recurrence generation is bounded and incremental, Goals Today/list rendering uses summaries, and `npm run validate:ios-release` is the fastest iOS gate.
- **2026-05 doc sync:** Product line repositioned through **Kairo v0.6** (**semver 0.6.0**); clarified independence from per-blob JSON revisions (e.g. goals record `version`).
- **2026-05 insights foundation:** `insightsRepository` + `src/lib/insights/*` deterministic reflection bundles over `getDayActivityRange` + goals; see **`docs/INSIGHTS.md`**.
- **2026-05 emotional timeline constitution:** `AGENTS.md`, `FEATURES.md`, `ROADMAP.md`, and companion docs state the **yearly mood color map** as the primary artifact; habits/goals/reminders/insights framed as supporting context.
