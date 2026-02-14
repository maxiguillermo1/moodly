## Moodly engineering handoff (read this first)

Goal: a new engineer can ship safely in ~10 minutes.

### What Moodly is

- Local‑first mood + note tracker (Calendar year view + month timeline + Journal).
- No backend. No network. All data is AsyncStorage.
- Privacy is non‑negotiable: **never log notes**.

### One mental model (layers)

- UI: `src/screens/`, `src/components/`, `src/hooks/`
- Pure rules: `src/utils/`, `src/logic/`, `src/insights/`
- Persistence API (UI imports): `src/storage/`
- Persistence implementation: `src/data/storage/`
- Logging/security: `src/security/` (impl in `src/lib/security/`)
- Dev perf probes: `src/perf/`

See `docs/architecture.md` for the enforced import rules.

### Data flow: “tap day → edit → save”

1) **User taps a day** in MonthGrid
   - `MonthGrid` uses month render models (`src/components/calendar/monthModel.ts`) to map day → `YYYY-MM-DD`.
2) **CalendarScreen selects the date** and loads any existing entry
   - `src/screens/CalendarScreen.tsx`:
     - updates `selectedDate` immediately
     - reads via `getEntry(dateKey)` with a latest-only guard (rapid taps → last tap wins)
3) **User saves**
   - UI calls `upsertEntry(entry)` from `src/storage`
4) **Storage persists first**
   - `src/data/storage/moodStorage.ts`:
     - validates key + mood (dev fail-fast; prod resilient)
     - serializes writes (prevents lost updates)
     - writes to AsyncStorage
     - only then updates RAM caches + derived indexes
5) **UI updates without full reload**
   - CalendarScreen updates `entriesByMonthKey` for the current month map (keeps scroll smooth).

### How to add a feature safely (rule of thumb)

- **Pure business rule** → `src/utils/` or `src/logic/`
- **Derived stats/aggregations** → `src/insights/`
- **Persistence change** → `src/data/storage/*` (plus `src/data/DATA_CONTRACT.md`)
- **UI flow** → `src/screens/*` (wire intent; keep heavy work out of scroll paths)
- **Reusable UI** → `src/components/*`

If you need storage from UI: import from `src/storage`, not AsyncStorage, not `src/data/storage/*`.

### Calendar performance rules (do not regress)

Hot paths:
- `CalendarScreen` month timeline (FlashList)
- `CalendarView` year pager (FlatList paging)
- `MonthGrid` / `DayCell` (tight loops)

Rules:
- No state updates during scroll/paging.
- Keep props stable (memoize callbacks; avoid inline objects).
- Avoid per-cell allocations; prefer cached month models and cached month matrices.
- CalendarScreen uses a **large mostly-static month window** to avoid periodic freezes; keep that strategy unless you have hard data.

### Key invariants (do not touch casually)

- **Local day keys**: `YYYY-MM-DD` derived from local calendar components.
  - `toISOString().slice(...)` is banned by ESLint.
- **Storage is untrusted**:
  - safe parse + validation
  - corruption → quarantine to `moodly.<key>.corrupt.<timestamp>` and reset
- **Persist-first**: caches update only after AsyncStorage succeeds.
- **Writes serialized**: prevents lost updates.
- **Privacy-safe logging**: metadata only; UI never calls `console.*`.

### How to debug jank (dev-only)

1) Reproduce the gesture (scroll months, swipe years).
2) Leave the screen to flush `perf.report`.
3) Read `perf.report.phases[]` (counts, p95, max).
4) If the phase is `DEV_METRO_OR_GC`, it’s usually Metro/GC/tooling (dev artifact).
5) Use breadcrumbs + phase tags to localize app work (see `docs/logger.md`).

### Dev-only debug scenarios (no UI changes)

In Metro console:

```js
globalThis.MoodlyDebug.list()
globalThis.MoodlyDebug.runAll()
globalThis.MoodlyDebug.run('rapidMonthTaps')
globalThis.MoodlyDebug.setChaos({ enabled: true, seed: 1, failNext: { getItem: 1 } })
```

### Quality gates

```bash
npm run lint
npx tsc --noEmit
npm test
```

