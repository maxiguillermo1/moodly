## Storage

Local persistence lives here (AsyncStorage, caching, parsing, quarantine).
Screens/components should import storage APIs from `src/storage`.
Do not import UI or navigation into storage.

Note:
- `src/storage/*` is a **facade** for product code — it re-exports **`src/data/repositories`** (stable domain entrypoints over `src/data/storage/*` implementations).
- **Mood/journal hot reads:** `getJournalEntriesSortedDescSnapshot` (Journal), `getCalendarEntriesByMonthIndexSnapshot` + `fetchMoodCalendarSnapshot` (calendar). Copy semantics: **`src/data/DATA_CONTRACT.md`** § Mood / journal read APIs.
- Implementation detail: **`src/data/storage/*`** (validation, quarantine, caches, write locks).
- Persisted **appearance** (`light` / `dark` / `system`) is consumed on boot by **`AppThemeProvider`** (`docs/DESIGN_SYSTEM.md`).
- **Schema / migrations** — `ensureLocalPersistenceReady()` (see `src/data/persistence/bootstrap.ts`). Before each version step, **`writePreMigrationBackup`** stores **`moodly.migrationBackup.<k>_to_<k+1>.<ts>`** (`migrationBackup.ts`).
- **Internal export (no UI)** — `buildMoodlyLocalExportV1` + validators in `src/data/persistence/localExport/moodlyLocalExport.ts` (requires `getAllKeys` on the `KeyValueStore` adapter).
- **Reminders (per-day list)**: **`moodly.dayTodos`** — **`getDayTodosForDate`**, **`addDayTodo`**, **`setDayTodoDone`**, **`setDayTodoReminder`**, **`deleteDayTodo`**, **`reorderOpenDayTodos`**, **`clearCompletedDayTodos`** (`src/data/storage/dayTodosStorage.ts`; types in **`src/types/todo.types.ts`**).
