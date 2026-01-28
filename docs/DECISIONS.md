## Moodly — Owner Decisions (5-year mindset)

This doc captures *implicit decisions* that are easy to accidentally break as the codebase grows.
If you change one of these, update this doc and the relevant module comments.

### 1) Date keys are **local** `YYYY-MM-DD` (not UTC)

- **Decision**: The canonical day identifier is a local date key string `YYYY-MM-DD`.
- **Where enforced**:
  - `src/lib/utils/date.ts` (formatting/parsing uses local `Date` fields)
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

### 3) “Today” highlighting is computed on mount (no midnight rollover)

- **Decision**: `MonthGrid` computes `todayIso` once per mount for performance/stability.
- **Where**: `src/components/calendar/MonthGrid.tsx`
- **Why**: avoids per-render date work on a hot path.
- **Failure mode**: if the app stays open across midnight, the ring may not move until remount.
- **If you change**: do it intentionally and test across midnight/DST; keep it cheap.

### 4) Storage is treated as untrusted input (quarantine on corruption)

- **Decision**: AsyncStorage values are runtime-validated; corrupt values are quarantined to a backup key and the primary key is reset to a safe default.
- **Where**:
  - `src/data/storage/moodStorage.ts`
  - `src/data/storage/settingsStorage.ts`
  - contract: `src/data/DATA_CONTRACT.md`
- **Why**: local storage can be partially written, manually edited in dev, or corrupted; the app must never crash.
- **Failure mode**: removing validation/quarantine can turn one bad write into a crash loop.

### 5) Session caches are allowed (performance), but must be invalidated on writes

- **Decision**: data layer uses in-memory caches and derived caches (group-by-month, sorted lists).
- **Where**: `src/data/storage/moodStorage.ts`
- **Invariant**: *all writes must be immutable-on-write and must invalidate derived caches*.
- **Failure mode**: stale derived caches causing UI to show outdated data until restart.

### 6) Screens should not import AsyncStorage or deep storage modules

- **Decision**: Screens/components/hooks use the `src/data` public API, never AsyncStorage directly.
- **Where enforced**: `eslint.config.cjs` (`no-restricted-imports`)
- **Why**: prevents bypassing caches/validation and keeps storage changes localized.

### 7) UI must never log sensitive payloads

- **Decision**: UI code must not call `console.*`; use `logger` which redacts and is production-safe.
- **Where**:
  - `src/lib/security/logger.ts`
  - `src/lib/logging/patchConsole.ts`
  - enforced in UI: `eslint.config.cjs` (`no-console`)
- **Failure mode**: leaking notes/entries into device logs or crash reports.

### 8) Performance guardrails: lists/grids are hot paths

- **Decision**: Calendar grids and year/month lists avoid per-cell/per-item allocations where possible.
- **Where**:
  - `src/components/calendar/MonthGrid.tsx`
  - `src/screens/CalendarView.tsx`, `src/screens/CalendarScreen.tsx`
- **If you change**: re-check scroll smoothness and navigation transitions; prefer memoized callbacks and stable styles.

### Good vs bad extensions

- **Good**: Add a new derived selector in `src/domain/*` and call it from a screen.
- **Bad**: Add “quick stats” logic directly in a screen by scanning the entire entries record on every render.
- **Good**: Add a new storage key in `src/data/storage/*` with validation + quarantine (plus contract update).
- **Bad**: Read/write raw AsyncStorage in a screen “just this once”.

