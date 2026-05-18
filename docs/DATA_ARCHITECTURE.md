# Moodly — local data architecture (database-ready)

**Product context:** Moodly is **v0.5** (pre-1.0 refinement). Persistence uses its own **schema rail** and per-blob revision numbers; those are independent of app semver — see [`CHANGELOG.md`](./CHANGELOG.md) § Versioning and [`ARCHITECTURE_STATE.md`](./ARCHITECTURE_STATE.md).

See also **[DATA_SAFETY.md](DATA_SAFETY.md)** (integrity, recovery, date keys, extensions policy) and **[ARCHITECTURE_STATE.md](ARCHITECTURE_STATE.md)** (schema snapshot).

Moodly is **local-only** today. This document explains how persistence is layered so a future **SQLite / Supabase / Firebase / Postgres** backend can replace the key-value adapter **without rewriting screens**.

## Philosophy (why this shape)

- **Screens stay dumb about I/O** — they call **`src/storage`** / repositories; implementation details stay in **`src/data/storage`** so storage can scale (sharding, SQLite) without UI churn.
- **Normalize where volume grows** — e.g. Reminders day shards + `TasksRecord` metadata, capped goal history — see [`AGENTS.md`](./AGENTS.md) § Data, scale, and future evolution.
- **Defensive by default** — parse, validate, quarantine; never log note bodies; forward migrations only; never silently overwrite newer on-disk schema versions.
- **Future sync / AI** — when added, they must preserve **local-first**, **calm UX**, and **explicit consent** (see [`ROADMAP.md`](./ROADMAP.md)).

**Quick index:** [`SCALABILITY.md`](./SCALABILITY.md) routes scale topics without duplicating this file.

## Layers (outside-in)

1. **UI** — React screens/hooks. Must not import `@react-native-async-storage/async-storage` directly.
2. **Repositories** (`src/data/repositories/`) — Stable, domain-shaped APIs (`entriesRepository`, `settingsRepository`, `extensionsRepository`, …). Prefer these in new code; they delegate to the storage modules today and can delegate to a remote client tomorrow.
3. **Storage modules** (`src/data/storage/*Storage.ts`) — Session caches, write locks, validation, and corruption quarantine per key. Still the implementation workhorses.
4. **Persistence core** (`src/data/persistence/`) — `KeyValueStore` interface, schema metadata, forward migrations.
5. **Adapter** — `getDefaultLocalKeyValueStore()` returns AsyncStorage typed as `KeyValueStore` (alias: `LocalStorageAdapter`). Swap this for a SQLite or HTTP client when needed.

Public import surface: **`src/storage`** re-exports **`src/data/repositories`** (which delegates to `src/data/storage/*` implementations today).

## Canonical models

| Concept | Persisted key | Canonical type | Notes |
|--------|----------------|----------------|-------|
| Mood + journal row | `moodly.entries` | `MoodEntry` (see `types/canonicalPersisted.ts`) | One row per local day; natural key `date` (`YYYY-MM-DD`). |
| Settings + extension *toggles* | `moodly.settings` | `AppSettings` | Order/stack flags; not per-day values. |
| Habit selections (values) | `moodly.habitSelections` | `{ v: 3, selections: Record<YYYY-MM-DD, HabitId[]>, toggleTotals: {} }` | **`selections`** only: per-day “on” habits (deduped, catalog order). **`toggleTotals`** is deprecated (always `{}`); Habits screen totals are **derived** from `selections`, not stored. Extensions do not show counts. See `habitSelectionsStorage`. |
| Tracked habits (config) | `moodly.trackedHabits` (see `habitTrackingStorage`) | `HabitId[]` | Which habits appear in the strip. |
| Tasks / Reminders metadata | `moodly.tasks` | `TasksRecord` | Normalized task foundation, recurrence templates, history, lists/tags, and migration marker. |
| Day Reminder shards | `moodly.tasks.day.<YYYY-MM-DD>` + `moodly.tasks.dayIndex` | `DayTodoItem[]` | Hot day-scoped Reminder reads/writes touch only the active local-day shard. |
| Legacy day todos | `moodly.dayTodos` | `Record<PersistedDayKey, DayTodoItem[]>` | Migration source only; valid rows migrate into task metadata and day shards once. |
| Goals | `moodly.goals` | `GoalsRecord` | Habit/target/average/project goals with progress history. |
| Insight timing (cooldowns) | `moodly.insights.reflectionTiming` | `{ schemaVersion: 1, topicLastSurfacedAtMs: Record<string, number> }` | **Not** computed insights — only “last time topic X was shown” for anti-spam. See `insightsReflectionStateStorage` + `docs/INSIGHTS.md`. |
| Daily Activity | *(not persisted)* | `DayActivity` (`src/types/dailyActivity.types.ts`) | **Read model only** — composed by `dailyActivityRepository` from entries, habits, goals, reminders, and local date; never written as its own blob. |
| Schema version | `moodly.schemaMeta` | `SchemaMeta` | Drives migrations only. |

**Date keys** — Always calendar-local `YYYY-MM-DD` validated with `isValidISODateKey` (`src/data/model/entry.ts`). DB migration can map these to `DATE` columns or timezone-aware timestamps later.

### Habit selections & derived “marked days”

- **Persisted**: only `selections` under `moodly.habitSelections` (envelope `v: 3`). Each habit id counts **at most once per day**; turning a habit off for a day removes that date from the map (or drops the id from that day’s array).
- **Not persisted**: cumulative “how many days” totals — computed on demand via `getHabitMarkedDayCounts()` by scanning normalized `selections` (O(number of days with at least one habit)).
- **`toggleTotals`**: legacy field kept as **`{}`** for backward compatibility; parsers ignore non-empty legacy values for UI and rewrite to `{}` when migrating.
- **UI split**: Today / journal **extensions** render habit chips **without** under-chip counts; the **Habits** tab list shows **“1 day” / “N days”** derived from storage as above.

**Scale note** — Day Reminders are now date-sharded for the hot Today/Todo paths, while `moodly.tasks` remains the metadata/recurrence record. `moodly.goals` remains a normalized JSON payload but exposes lightweight summary selectors for list/Today rendering. Before cloud sync, imported datasets, OS notification scheduling at scale, or large completed-history views, split the remaining aggregate stores into SQLite tables or finer id/date-sharded keys.

### Daily Activity (composed read model)

- **Not a store** — no `moodly.dailyActivity` key; no migration for the DTO itself.
- **Read path** — `getDayActivity` / `getDayActivityRange` / `getTodayActivity` aggregate **already validated** data from mood, habit selections, tracked habits, goals, and day reminder shards. **`getDayActivityRange`** uses **bounded concurrency** for per-day reminder shard reads (chunked `getTasksForDate`) so max-width ranges do not schedule thousands of parallel AsyncStorage operations.
- **Write path** — unchanged; UI and hooks keep using domain repositories. Daily Activity must never become the write surface.

Full contract: [`DAILY_ACTIVITY.md`](./DAILY_ACTIVITY.md).

## Repository map

| Repository | Responsibility |
|------------|----------------|
| `entriesRepository` | CRUD + aggregates for mood/journal rows. |
| `settingsRepository` | `AppSettings` read/write and focused setters. |
| `extensionsRepository` | Namespaced facades for habit selections, tracking, and day reminders (values). |
| `tasksRepository` | Normalized task/reminder queries and day-scoped compatibility APIs. |
| `goalsRepository` | Goals CRUD, progress writes, archive/delete. |
| `calendarSnapshotRepository` | Read-optimized calendar snapshot (`fetchMoodCalendarSnapshot`). |
| `dailyActivityRepository` | **Read-only** composed `DayActivity` per local day or range; delegates to existing stores (see [`DAILY_ACTIVITY.md`](./DAILY_ACTIVITY.md)). |
| `insightsRepository` | **Read-only** `InsightBundle` for week/month windows; uses `getDayActivityRange` + goals history (see [`INSIGHTS.md`](./INSIGHTS.md)). |
| `narrativeRepository` | **Read-only** `NarrativeBundle` for bounded life windows; uses `getDayActivityRange` only (see [`NARRATIVE.md`](./NARRATIVE.md)). |
| `sessionRepository` | Session warmups + demo seed. |

Aliases for readability (same implementation): `moodEntryRepository` / `journalEntryRepository` on the entries module where exported.

## Schema versioning & migrations

- **Key**: `moodly.schemaMeta` — JSON `{ schemaVersion: number, migratedAt?: number }`.
- **Target version**: `CURRENT_SCHEMA_VERSION` in `src/data/persistence/schemaConstants.ts`.
- **Registry**: `MIGRATIONS[k]` transforms data from version `k` → `k + 1` (`src/data/persistence/migrations/registry.ts`).
- **Bootstrap**: `ensureLocalPersistenceReady()` runs once per session (from cold storage reads) — repairs unreadable meta, then applies forward migrations.
- **Pre-migration backup** (automatic): before each step `k` → `k+1`, `writePreMigrationBackup` writes a single-key JSON envelope under `moodly.migrationBackup.<k>_to_<k+1>.<timestamp>` (`kind: moodly.migrationBackup.v1`, `snapshot: { [AsyncStorageKey]: rawString | null }`). Keys listed in `knownStorageKeys.ts` plus `moodly.tasks.day.*` shards (from `dayIndex` and optional `getAllKeys`). If a migration step throws after backup, the prior user payload remains recoverable from the newest matching backup key (manual / support tooling — not auto-restored to avoid double-applying transforms).

If on-disk `schemaVersion` **exceeds** the app’s `CURRENT_SCHEMA_VERSION`, migrations **no-op** (newer data from a newer app install). Missing migration steps log an error and throw in the migration runner (defect guard).

## Internal full export (no UI)

- **Module**: `src/data/persistence/localExport/moodlyLocalExport.ts`.
- **Purpose**: produce a **validated JSON envelope** (`kind: moodly.localExport.v1`, `formatRevision: 1`, `exportedAtMs`, `schemaMetaRaw`, `kv`) for support, future “export my data”, or tests. Excludes `.corrupt.*` keys and `moodly.migrationBackup.*` by default.
- **API**: `buildMoodlyLocalExportV1(store)` requires `KeyValueStore.getAllKeys`; `parseMoodlyLocalExportJson` / `validateMoodlyLocalExportPayload` validate structure without writing disk.
- **Size cap**: `MOODLY_LOCAL_EXPORT_MAX_APPROX_BYTES` — throws if exceeded (protects memory).

## Corruption & validation

Invalid JSON or invalid shapes are handled by **quarantine + safe defaults** (see `src/data/DATA_CONTRACT.md`). Storage layers must not throw into UI on parse failure; they log and continue.

## Future: local → database migration

1. Implement `KeyValueStore` (or a richer `LocalStorageAdapter`) backed by SQLite/replica.
2. Keep **repository method signatures** stable; swap internals to SQL/HTTP.
3. Optional one-shot **import job**: read legacy AsyncStorage keys, write normalized tables, bump `schemaVersion`.
4. Prefer **surrogate UUIDs** in the DB while keeping `date` or `client_local_id` for idempotency; the app already uses stable natural keys for entries.

## Adding a new extension (values vs config)

1. **Config / toggles** — Extend `AppSettings` + migration if keys need defaults; keep toggles in `moodly.settings` only.
2. **Per-day values** — New key `moodly.<extensionName>` as `Record<YYYY-MM-DD, …>` or a versioned envelope `{ v: 1, days: { … } }` if you need in-place schema bumps.
3. **Registry** — Export CRUD from a `*Storage.ts` module; wrap in `extensionsRepository` (or a nested namespace).
4. **Toggle off** — Do **not** delete value stores unless product explicitly requires it; UI hides the extension.

## Testing

Persistence tests live under `src/data/persistence/*.test.ts` and `src/data/storage/*.test.ts` (malformed JSON, migrations, large maps, cold behavior).

**Note:** `jest.resetModules()` remounts `@react-native-async-storage/async-storage`’s in-memory mock and clears persisted fixtures. For “relaunch with disk intact”, use `resetEntriesStorageSessionStateForTests()` from `moodStorage` instead of resetting all modules.
