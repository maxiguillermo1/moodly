## Moodly — Owner Decisions (5-year mindset)

This doc captures *implicit decisions* that are easy to accidentally break as the codebase grows.
If you change one of these, update this doc and the relevant module comments.

### 1) Date keys are **local** `YYYY-MM-DD` (not UTC)

- **Decision**: The canonical day identifier is a local date key string `YYYY-MM-DD`.
- **Where enforced**:
  - `src/lib/utils/date.ts` (`toLocalDayKey`, `formatDateToISO`, `parseISODate`)
  - `src/data/model/entry.ts` (`isValidISODateKey`)
- **Why**: Product semantics are “how was *my day*”, which is naturally local time.
- **Failure mode**: using `toISOString().slice(0,10)` (UTC) can shift days near midnight and break streaks/history.
- **Do not change casually**: switching to UTC keys is a migration-level decision.

### 2) Month indexing is **0-based** in UI components

- **Decision**: Calendar UI components use `monthIndex0` (`0..11`) because JS `Date` does.
- **Where**:
  - `src/components/calendar/MonthGrid.tsx`
  - `src/screens/CalendarView.tsx`, `src/screens/CalendarScreen.tsx`
- **Failure mode**: off-by-one month bugs when mixing with `YYYY-MM` strings (which are 1-based).

### 3) “Today” is a **single source of truth** that updates across midnight (no polling)

- **Decision**: Calendar screens own `todayKey` via `useTodayKey()` (one timer to next local midnight + AppState “active” resync).
- **Where**:
  - `src/hooks/useTodayKey.ts`
  - `src/screens/CalendarScreen.tsx`, `src/screens/CalendarView.tsx` (pass `todayKey` to `MonthGrid`)
- **Why**: fixes “app open across midnight” staleness **without polling** and without putting `new Date()` calls in hot loops.
- **Failure mode**: stale “today” highlight/title until remount if this hook is bypassed.
- **Enforcement**: keep `todayKey` a primitive string; avoid propagating new objects/arrays that could cause rerenders during scroll.

### 4) Storage is treated as untrusted input (quarantine on corruption)

- **Decision**: AsyncStorage values are runtime-validated; corrupt values are quarantined to a backup key and the primary key is reset to a safe default.
- **Where**:
  - `src/data/storage/*` (current implementation)
  - `src/storage` (facade used by UI)
  - contract: `src/data/DATA_CONTRACT.md`
- **Why**: local storage can be partially written, manually edited in dev, or corrupted; the app must never crash.
- **Failure mode**: removing validation/quarantine can turn one bad write into a crash loop.

### 5) Session caches are allowed (performance), but must be invalidated on writes

- **Decision**: data layer uses in-memory caches and derived caches (group-by-month, sorted lists).
- **Where**: `src/data/storage/moodStorage.ts`
- **Invariant**: *all writes must be immutable-on-write and must invalidate/update derived caches*.
- **Failure mode**: stale derived caches causing UI to show outdated data until restart.

### 6) Screens should not import AsyncStorage or deep storage modules

- **Decision**: Screens/components/hooks import persistence APIs from `src/storage` (facade), never AsyncStorage or deep data modules directly.
- **Where enforced**: `eslint.config.cjs` (`no-restricted-imports`)
- **Why**: prevents bypassing caches/validation and keeps persistence changes localized.

### 6.1) UTC date-key derivation is blocked

- **Decision**: The codebase bans deriving date keys from UTC (`toISOString().slice(...)`).
- **Where enforced**: `eslint.config.cjs` (`no-restricted-syntax`)
- **Why**: prevents subtle day-shift bugs near midnight/DST.

### 7) UI must never log sensitive payloads

- **Decision**: UI code must not call `console.*`; use `logger` which redacts and is production-safe.
- **Where**:
  - `src/security/*` facade (impl: `src/lib/security/logger.ts`)
  - console patch: `src/lib/logging/patchConsole.ts`
  - enforced in UI: `eslint.config.cjs` (`no-console`)
- **Failure mode**: leaking notes/entries into device logs or crash reports.

### 8) Performance guardrails: lists/grids are hot paths

- **Decision**: Calendar grids and year/month lists avoid per-cell/per-item allocations where possible.
- **Where**:
  - `src/components/calendar/MonthGrid.tsx`
  - `src/screens/CalendarView.tsx`, `src/screens/CalendarScreen.tsx`
- **If you change**: re-check scroll smoothness and navigation transitions; prefer memoized callbacks and stable styles.

### 9) Dev-only fail-fast at module boundaries

- **Decision**: In development, invalid inputs to data-layer boundaries should throw early (faster debugging).
- **Where**:
  - `src/data/storage/moodStorage.ts` (`getEntry`, `upsertEntry`, `createEntry`, range helpers)
  - `src/data/storage/settingsStorage.ts` (settings invariants)
- **Production behavior**: remains resilient (logs metadata and uses safe fallbacks instead of crashing).

### 10) Writes are serialized (no lost updates)

- **Decision**: Overlapping writes must not race. Storage uses a simple promise “tail” lock per key to serialize mutations.
- **Where**:
  - `src/data/storage/moodStorage.ts`
  - `src/data/storage/settingsStorage.ts`
- **Failure mode**: two saves overlap → last writer wins → silent data loss.

### 11) Deterministic fault injection exists (dev/test only)

- **Decision**: Storage has a deterministic chaos injector (seeded) to reproduce AsyncStorage failures/delays.
- **Where**:
  - injection point: `src/data/storage/asyncStorage.ts`
  - chaos config: `src/data/storage/chaos.ts`
  - dev runner: `src/dev/debugScenarios.ts` (installed in dev by `src/app/RootApp.tsx`)
- **Why**: reliability issues must be reproducible, not “it happened once”.

### Good vs bad extensions

- **Good**: Add a new derived selector in `src/domain/*` and call it from a screen.
- **Bad**: Add “quick stats” logic directly in a screen by scanning the entire entries record on every render.
- **Good**: Add a new storage key in `src/data/storage/*` with validation + quarantine (plus contract update).
- **Bad**: Read/write raw AsyncStorage in a screen “just this once”.

