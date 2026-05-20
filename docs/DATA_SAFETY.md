# Kairo — data safety & local persistence reliability

**Audience:** engineers auditing correctness, corruption recovery, and future database migration.  
**Pair with:** [`DATA_CONTRACT.md`](../src/data/DATA_CONTRACT.md), [`DATA_ARCHITECTURE.md`](./DATA_ARCHITECTURE.md), [`STABILITY_NOTES.md`](./STABILITY_NOTES.md).

## 1. Canonical date key (single standard)

- **Format:** `YYYY-MM-DD` — **local calendar day**, not UTC midnight from `toISOString().slice`.
- **Validation:** `isValidLocalCalendarDayKey` / `isValidISODateKey` (shared semantics via `parseISODate` in `src/lib/utils/date.ts` and `src/data/model/entry.ts`).
- **Rule:** Mood rows, journal list items, calendar selection, and per-day extension payloads **must** use this key. Route params that are not valid keys are **coerced** (e.g. Reminders screen → `coerceLocalDayKeyOrToday`).

Mood, journal, and calendar UIs all read/write **`kairo.entries`** keyed by this string. There is **at most one** `MoodEntry` per date key.

## 2. Data models & storage keys

| Key | Shape | Integrity notes |
|-----|--------|-----------------|
| `kairo.schemaMeta` | `{ schemaVersion, migratedAt? }` | Forward migrations only; corrupt meta quarantined. |
| `kairo.entries` | `Record<YYYY-MM-DD, MoodEntry>` | Runtime validation on load (`validateEntriesRecord`); key must equal `entry.date`. |
| `kairo.settings` | `AppSettings` | Safe parse + defaults; write queue. |
| `kairo.habitSelections` | `{ v:3, selections: Record<YYYY-MM-DD, HabitId[]>, toggleTotals: {} }` | Per-day values; `toggleTotals` is legacy-only (always `{}`); marked-day totals are **derived** from `selections`. Quarantines corrupt root JSON; **not** deleted when habits toggle off. |
| `kairo.trackedHabits` | `HabitId[]` | Extension **configuration** (which habits appear); corrupt root JSON resets to catalog defaults. |
| `kairo.tasks.day.<YYYY-MM-DD>` | `DayTodoItem[]` | Hot day-scoped Reminders shard; normalized items; capped per day. |
| `kairo.tasks.dayIndex` | `YYYY-MM-DD[]` | Index of day shards used for aggregate/debug reads. |
| `kairo.tasks` | `TasksRecord` | Task metadata, recurrence templates/history, lists/tags, and legacy migration marker. |
| `kairo.dayTodos` | `Record<YYYY-MM-DD, DayTodoItem[]>` | Legacy migration source only; corrupt root JSON quarantined. |

**Extensions:** Visibility/order live in **`AppSettings`** (`habitsEnabled`, `todayTodoEnabled`, `todayExtensionsOrder`, …). **Values** live in the per-day stores above. Toggling off or hiding from Today **does not** erase value stores (verified in tests).

## 3. Write safety & races

- **Entries (`kairo.entries`):** All mutations go through **`withEntriesWriteLock`** — serialized writes, **persist-before-RAM** cache updates.
- **Settings:** **`withSettingsWriteLock`** with read-modify-write inside the lock, so concurrent toggles cannot clobber sibling settings.
- **Habit selections / day Reminders / tracked habits:** Each module has a **write tail** queue and awaits persistence bootstrap before mutations.
- **Upsert invalid data:** `upsertEntry` **throws** on invalid date or mood so callers cannot assume persistence succeeded (no silent partial state).
- **Bootstrap write gate:** Failed local persistence bootstrap, missing migrations, or disk schema newer than this app version blocks writes before `setItem` / `removeItem`.
- **Cache isolation:** Entry/settings reads return defensive copies; accidental caller mutation cannot poison in-memory session caches.
- **Day Reminder isolation:** Exported day Reminder reads/mutation results clone item objects so UI mutation cannot poison cached per-day lists.

## 4. Load safety & corruption

- **JSON.parse:** Used only inside **try/catch** (or validated `readSchemaMeta`); failures yield **defaults** or **empty maps**, plus **metadata-only** logs (no note text).
- **Quarantine:** Unreadable primary values are copied to `kairo.<key>.corrupt.<timestamp>` and the primary key reset to a safe default (`DATA_CONTRACT.md`).
- **Partial corruption:** Invalid **rows** are dropped; valid rows **retain** the rest of the map. Repairable partial settings are normalized with defaults instead of being reset wholesale.

## 5. Duplicates

- **Mood/journal:** Impossible to have two stored rows for the same calendar day: the record is a **map keyed by date**; upsert **replaces** the value for that key.
- **Day Reminders:** Items require stable `id`; day shards persist one local day at a time with normalization.

## 6. Migration strategy

- **Version:** `CURRENT_SCHEMA_VERSION` in `src/data/persistence/schemaConstants.ts`; on-disk stamp in `kairo.schemaMeta`.
- **Runner:** `ensureLocalPersistenceReady()` before cold reads and extension first-write paths; steps in `MIGRATIONS` (forward-only).
- **Policy:** Disk schema **newer** than app → bootstrap fails and writes are blocked (do not downgrade, do not overwrite future payloads). Missing step → logged and thrown. Transient bootstrap failures reset the session singleton so the next storage entrypoint retries; reads may fall back safely, but writes do not proceed until bootstrap succeeds.

Document each new step in [`DATA_ARCHITECTURE.md`](./DATA_ARCHITECTURE.md) when bumping version.

### Pre-migration backup blobs

Before each migration step, Kairo writes **`kairo.migrationBackup.<from>_to_<to>.<timestamp>`** containing `kind: kairo.migrationBackup.v1` and a **`snapshot`** map of raw string values for primary `kairo.*` keys plus day reminder shards (see `src/data/persistence/migrations/migrationBackup.ts`). If a step fails after backup, support can inspect the latest backup; the app does **not** auto-restore (avoid re-running half-applied transforms).

### User export / import (Settings)

`src/data/persistence/localExport/kairoLocalExport.ts` defines **`kairo.localExport.v1`** — a validated JSON shape for a full local key snapshot. Settings → **Export My Data** / **Import Data** uses `userDataExportRepository` (`buildKairoUserExportV1`, `applyKairoLocalImportV1`). Export merges SQLite snapshots for mood entries, habit selections, and goals into `kv` before share; import restores AsyncStorage then re-imports SQLite domains.

## 7. Repository & UI boundary

- **Public façade:** `src/storage` → `src/data/repositories` → `src/data/storage/*` implementations.
- **UI** must not call `AsyncStorage` directly; persistence logic stays in the data layer for one place to fix validation and locking.

## 8. Manual smoke (data-focused)

Run on a device or simulator after substantive storage changes:

1. **Today:** Save mood + note; kill app; reopen — same day shows same data.
2. **Journal:** Edit entry; kill app; reopen — text and date unchanged.
3. **Calendar:** Tap day, save mood; scroll away and back — same mood on that day.
4. **Extensions:** Toggle Habits off → on; prior **per-day** selections still present (`kairo.habitSelections`).
5. **Tracked habits:** Hide a completed habit from Today; completion remains in the Habits screen and per-day store.
6. **Reminders:** Add item; invalid deep-link date → loads **today** without crashing (`coerceLocalDayKeyOrToday`); disabling/re-enabling Reminders in Settings must preserve the day shard.
7. **Rapid saves:** Hammer Save / mood changes — no duplicate days, no lost last write (serialized queue).
8. **Malformed disk (dev):** Inject corrupt JSON into a key — app opens, primary key reset or quarantined, no crash loop.
9. **Future schema guard (dev):** Set `kairo.schemaMeta.schemaVersion` above `CURRENT_SCHEMA_VERSION`; app must not write over local payloads.
10. **Cache mutation guard (dev):** Mutate objects returned by `getSettings()` / `getAllEntries()` in a test harness; subsequent reads must remain unchanged.

## 9. Future database

- Natural key today: **`date` (local day)** on mood rows; extension tables would use the same **date key** or a surrogate FK with uniqueness on `(user_id, local_date)` as appropriate.
- Repositories and `KeyValueStore` keep a **swap-friendly** boundary for SQLite / remote sync later.

## 10. Known residual risks

- **AsyncStorage size:** Very large mood/journal/goals histories are still aggregate JSON payloads; day Reminders are already date-sharded. Future SQLite can shard by month/year/id.
- **Shard/SQLite trigger:** Move before sync/import or when 10k-row cold hydration/save latency becomes visible on the oldest supported device.
- **Future sync conflicts:** Not applicable until backend/sync exists; local write locks protect only the single-device store.
- **Clock skew:** `createdAt` / `updatedAt` are device ms; not used for calendar-day identity.
- **Multi-device:** Not applicable until sync exists; local device is source of truth.

Last reviewed: tied to repo `CURRENT_SCHEMA_VERSION` and migration registry in `src/data/persistence/`.
