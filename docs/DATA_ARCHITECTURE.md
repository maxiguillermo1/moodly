# Kairo — local data architecture (database-ready)

**Product context:** Kairo is **v0.6** (pre-1.0 refinement). Persistence uses its own **schema rail** and per-blob revision numbers; those are independent of app semver — see [`CHANGELOG.md`](./CHANGELOG.md) § Versioning and [`ARCHITECTURE_STATE.md`](./ARCHITECTURE_STATE.md).

See also **[DATA_SAFETY.md](DATA_SAFETY.md)** (integrity, recovery, date keys, extensions policy) and **[ARCHITECTURE_STATE.md](ARCHITECTURE_STATE.md)** (schema snapshot).

Kairo is **local-only** today. This document explains how persistence is layered so a future **SQLite / Supabase / Firebase / Postgres** backend can replace the key-value adapter **without rewriting screens**.

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
4. **Persistence core** (`src/data/persistence/`) — `KeyValueStore` interface, schema metadata, forward migrations, **SQLite** (`src/data/persistence/sqlite/`).
5. **Adapter** — `getDefaultLocalKeyValueStore()` returns AsyncStorage typed as `KeyValueStore` (alias: `LocalStorageAdapter`). Mood entries additionally use **`expo-sqlite`** (`kairo.db`) via `moodEntriesBackend.ts`.

Public import surface: **`src/storage`** re-exports **`src/data/repositories`** (which delegates to `src/data/storage/*` implementations today).

## Canonical models

| Concept | Persisted key | Canonical type | Notes |
|--------|----------------|----------------|-------|
| Mood + journal row | `kairo.entries` (legacy) + SQLite `mood_entries` | `MoodEntry` (see `types/canonicalPersisted.ts`) | One row per local day; natural key `date` (`YYYY-MM-DD`). **Active backend:** SQLite after bootstrap import (`kairo.entries.backend` = `sqlite`). |
| Settings + extension *toggles* | `kairo.settings` | `AppSettings` | Order/stack flags; not per-day values. |
| Habit selections (values) | `kairo.habitSelections` (legacy) + SQLite `habit_selections` | `{ v: 3, selections: Record<YYYY-MM-DD, HabitId[]>, toggleTotals: {} }` | **`selections`** only: per-day “on” habits (deduped, catalog order). **Active backend:** SQLite after bootstrap import (`kairo.habitSelections.backend` = `sqlite`). |
| Tracked habits (config) | `kairo.trackedHabits` (see `habitTrackingStorage`) | `HabitId[]` | Which habits appear in the strip. |
| Tasks / Reminders metadata | `kairo.tasks` | `TasksRecord` | Normalized task foundation, recurrence templates, history, lists/tags, and migration marker. |
| Day Reminder shards | `kairo.tasks.day.<YYYY-MM-DD>` + `kairo.tasks.dayIndex` | `DayTodoItem[]` | Hot day-scoped Reminder reads/writes touch only the active local-day shard. |
| Legacy day todos | `kairo.dayTodos` | `Record<PersistedDayKey, DayTodoItem[]>` | Migration source only; valid rows migrate into task metadata and day shards once. |
| Goals | `kairo.goals` (legacy) + SQLite `goals` / `goal_progress` | `GoalsRecord` | Habit/target/average/project goals with progress history. **Active backend:** SQLite after bootstrap import (`kairo.goals.backend` = `sqlite`). |
| Insight timing (cooldowns) | `kairo.insights.reflectionTiming` | `{ schemaVersion: 1, topicLastSurfacedAtMs: Record<string, number> }` | **Not** computed insights — only “last time topic X was shown” for anti-spam. See `insightsReflectionStateStorage` + `docs/INSIGHTS.md`. |
| Daily Activity | *(not persisted)* | `DayActivity` (`src/types/dailyActivity.types.ts`) | **Read model only** — composed by `dailyActivityRepository` from entries, habits, goals, reminders, and local date; never written as its own blob. |
| Schema version | `kairo.schemaMeta` | `SchemaMeta` | Drives migrations only. |

**Date keys** — Always calendar-local `YYYY-MM-DD` validated with `isValidISODateKey` (`src/data/model/entry.ts`). DB migration can map these to `DATE` columns or timezone-aware timestamps later.

### Habit selections & derived “marked days”

- **Persisted**: only `selections` under `kairo.habitSelections` (envelope `v: 3`). Each habit id counts **at most once per day**; turning a habit off for a day removes that date from the map (or drops the id from that day’s array).
- **Not persisted**: cumulative “how many days” totals — computed on demand via `getHabitMarkedDayCounts()` by scanning normalized `selections` (O(number of days with at least one habit)).
- **`toggleTotals`**: legacy field kept as **`{}`** for backward compatibility; parsers ignore non-empty legacy values for UI and rewrite to `{}` when migrating.
- **UI split**: Today / journal **extensions** render habit chips **without** under-chip counts; the **Habits** tab list shows **“1 day” / “N days”** derived from storage as above.

**Scale note** — Day Reminders are date-sharded for the hot Today/Todo paths, while `kairo.tasks` remains the metadata/recurrence record. Mood entries, habit selections, and goals now use SQLite row stores; remaining aggregate keys (settings, tasks metadata, insight cooldowns) stay on AsyncStorage until import/sync pressure warrants further normalization.

### Daily Activity (composed read model)

- **Not a store** — no `kairo.dailyActivity` key; no migration for the DTO itself.
- **Read path** — `getDayActivity` / `getDayActivityRange` / `getTodayActivity` aggregate **already validated** data from mood, habit selections, tracked habits, goals, and day reminder shards. **`getDayActivityRange`** uses **bounded concurrency** for per-day reminder shard reads (chunked `getTasksForDate`) so max-width ranges do not schedule thousands of parallel AsyncStorage operations.
- **Write path** — unchanged; UI and hooks keep using domain repositories. Daily Activity must never become the write surface.

Full contract: [`DAILY_ACTIVITY.md`](./DAILY_ACTIVITY.md).

## Repository map

| Repository | Responsibility |
|------------|----------------|
| `entriesRepository` | CRUD + aggregates for mood/journal rows. Hot reads: **`getJournalEntriesSortedDescSnapshot`** (Journal), **`getCalendarEntriesByMonthIndexSnapshot`** (calendar index); warm writes avoid full-record clones inside the write lock. |
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

- **Key**: `kairo.schemaMeta` — JSON `{ schemaVersion: number, migratedAt?: number }`.
- **Target version**: `CURRENT_SCHEMA_VERSION` in `src/data/persistence/schemaConstants.ts`.
- **Registry**: `MIGRATIONS[k]` transforms data from version `k` → `k + 1` (`src/data/persistence/migrations/registry.ts`).
- **Bootstrap**: `ensureLocalPersistenceReady()` runs once per session (from cold storage reads) — repairs unreadable meta, then applies forward migrations.
- **Pre-migration backup** (automatic): before each step `k` → `k+1`, `writePreMigrationBackup` writes a single-key JSON envelope under `kairo.migrationBackup.<k>_to_<k+1>.<timestamp>` (`kind: kairo.migrationBackup.v1`, `snapshot: { [AsyncStorageKey]: rawString | null }`). Keys listed in `knownStorageKeys.ts` plus `kairo.tasks.day.*` shards (from `dayIndex` and optional `getAllKeys`). If a migration step throws after backup, the prior user payload remains recoverable from the newest matching backup key (manual / support tooling — not auto-restored to avoid double-applying transforms).

If on-disk `schemaVersion` **exceeds** the app’s `CURRENT_SCHEMA_VERSION`, migrations **no-op** (newer data from a newer app install). Missing migration steps log an error and throw in the migration runner (defect guard).

## User export / import (Settings)

- **UI**: Settings → **Export My Data** / **Import Data** (`SettingsScreen.tsx`).
- **Repository**: `userDataExportRepository` — `exportUserDataJson`, `importUserDataFromJson`.
- **Export builder**: `buildKairoUserExportV1` merges SQLite snapshots for mood entries, habit selections, and goals into the `kv` map before serialization.
- **Import restore**: `applyKairoLocalImportV1` writes `kv` to AsyncStorage, clears SQLite domain caches, and re-runs bootstrap import rails (`forceReimportAllSqliteFromAsyncStorage`).
- **File helpers**: `src/lib/userData/userDataTransfer.ts` (share sheet + document picker).

## Internal export envelope

- **Module**: `src/data/persistence/localExport/kairoLocalExport.ts`.
- **Purpose**: validated JSON envelope (`kind: kairo.localExport.v1`, `formatRevision: 1`, `exportedAtMs`, `schemaMetaRaw`, `kv`) for support, Settings export/import, and tests. Excludes `.corrupt.*` keys and `kairo.migrationBackup.*` by default.
- **API**: `buildKairoLocalExportV1(store)` requires `KeyValueStore.getAllKeys`; `parseKairoLocalExportJson` / `validateKairoLocalExportPayload` validate structure without writing disk.
- **Size cap**: `KAIRO_LOCAL_EXPORT_MAX_APPROX_BYTES` — throws if exceeded (protects memory).

## Corruption & validation

Invalid JSON or invalid shapes are handled by **quarantine + safe defaults** (see `src/data/DATA_CONTRACT.md`). Storage layers must not throw into UI on parse failure; they log and continue.

## SQLite mood entries (implemented)

Mood/journal rows are normalized in **`kairo.db`** (`expo-sqlite`):

- **Module rail**: `src/data/persistence/sqlite/` — connection singleton, `SQL_MIGRATIONS`, `CURRENT_SQL_SCHEMA_VERSION`.
- **Table**: `mood_entries(date PRIMARY KEY, mood, note, created_at_ms, updated_at_ms)` + indexes on `updated_at_ms` and year-month prefix.
- **Bootstrap** (`ensureLocalPersistenceReady`): AsyncStorage JSON migrations → open SQLite → SQL migrations → **import** legacy `kairo.entries` once → set `kairo.entries.backend` = `sqlite`.
- **Storage module**: `moodStorage.ts` unchanged at the repository/façade boundary; persists via `moodEntriesBackend.ts` (row upserts, not full JSON blob rewrites).
- **Session caches** (`entriesByMonthCache`, journal sorted cache, year index) unchanged — still protect calendar/journal hot paths.

Scale harness: `src/qa/entriesScaleHarness.ts` + `entriesScaleHarness.test.ts` (1k / 5k / 10k synthetic tiers). Run via `npm run test:storage-stress`. Physical-device profiling procedure: [`PERFORMANCE_BENCHMARKS.md`](./PERFORMANCE_BENCHMARKS.md).

## SQLite habit selections (implemented)

- **Tables**: `habit_selections(date, habit_id)` composite primary key; index on `date`.
- **Bootstrap**: `ensureHabitSelectionsImportedFromAsyncStorage` after SQL migrations (idempotent).
- **Storage module**: `habitSelectionsStorage.ts` via `habitSelectionsBackend.ts` (row upserts, not full JSON blob rewrites on hot paths).

## SQLite goals (implemented)

- **Tables**: `goals(id, payload_json, updated_at_ms)` + `goal_progress(goal_id, date, value, note, created_at_ms)`.
- **Bootstrap**: `ensureGoalsImportedFromAsyncStorage` after SQL migrations (idempotent).
- **Storage module**: `goalsStorage.ts` via `goalsBackend.ts` (goal row + progress rows).

## Future: remaining domains → cloud

1. Reminders day shards / tasks metadata may move to SQLite when import/sync pressure appears.
2. Keep **repository method signatures** stable; swap internals to SQL/HTTP.
3. **Cloud sync (implemented):** Supabase Auth + Postgres — see [`SUPABASE.md`](./SUPABASE.md).
4. Prefer **surrogate UUIDs** in remote DB while keeping `date` or `client_local_id` for idempotency.

## Supabase cloud sync (implemented)

When `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set:

- **Auth:** Apple, Google, email/password (`AccountScreen`, `AuthProvider`).
- **Cloud truth:** Postgres tables with RLS (`supabase/migrations/`).
- **Local cache:** existing SQLite + AsyncStorage unchanged for UI hot paths.
- **Sync:** outbox push + pull merge (`src/cloud/sync/`, `src/data/sync/syncBridge.ts`).

Full setup: [`SUPABASE.md`](./SUPABASE.md).

## Adding a new extension (values vs config)

1. **Config / toggles** — Extend `AppSettings` + migration if keys need defaults; keep toggles in `kairo.settings` only.
2. **Per-day values** — New key `kairo.<extensionName>` as `Record<YYYY-MM-DD, …>` or a versioned envelope `{ v: 1, days: { … } }` if you need in-place schema bumps.
3. **Registry** — Export CRUD from a `*Storage.ts` module; wrap in `extensionsRepository` (or a nested namespace).
4. **Toggle off** — Do **not** delete value stores unless product explicitly requires it; UI hides the extension.

## Testing

Persistence tests live under `src/data/persistence/*.test.ts` and `src/data/storage/*.test.ts` (malformed JSON, migrations, large maps, cold behavior).

**Note:** `jest.resetModules()` remounts `@react-native-async-storage/async-storage`’s in-memory mock and clears persisted fixtures. For “relaunch with disk intact”, use `resetEntriesStorageSessionStateForTests()` from `moodStorage` instead of resetting all modules.
