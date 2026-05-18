# Testing

## Commands

From the repo root (requires Node/npm; no `.env` files are used):

```bash
npm install
npm test
```

Other quality gates:

```bash
npm run validate
npm run test:storage-stress
```

Opt-in long-running soak test:

```bash
npm run test:soak
```

`test:soak` is intentionally **not** part of CI or `validate:release`. It loops until manually stopped with `Ctrl-C`, writes a live `SOAK_TEST_REPORT.md`, and uses Jest's AsyncStorage mock so it does not mutate simulator/device/user data. For a bounded smoke run, use:

```bash
SOAK_MAX_LOOPS=25 SOAK_INTERVAL_MS=10 npm run test:soak
```

For hot-path profiling that separates user-facing loads/writes from full validation scans:

```bash
SOAK_PROFILE=hot-path SOAK_MAX_LOOPS=700 SOAK_INTERVAL_MS=1 SOAK_CLEANUP=1 npm run test:soak
```

Useful environment options:

- `SOAK_MAX_LOOPS=<n>` stops after `n` loops; omit for an overnight/manual-stop run.
- `SOAK_INTERVAL_MS=<n>` controls the wait between loops; default is `250`.
- `SOAK_CHECKPOINT_EVERY=<n>` controls report/memory checkpoint frequency; default is `5`.
- `SOAK_CLEANUP=1` clears the isolated mock storage at shutdown and removes any previous report at startup.
- `SOAK_PROFILE=hot-path` skips full validation passes and keeps app hot-path timings separate from harness overhead in `SOAK_TEST_REPORT.md`.

**Release validation (matches CI):**

```bash
npm run validate:release
```

This release command includes:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run test:storage-stress`
- `npm run doctor`
- `npm run export:bundles-check`

Faster check (**iOS** bundle only):

```bash
npm run export:ios-check
```

Outputs land in **`.tmp-expo-export/`** (gitignored). For a **sequenced web roadmap** (export, hosting, PWA), see **`docs/WEB_DEPLOYMENT_CHUNKS.md`**.

### Continuous integration

On **GitHub**, pushes and pull requests to **`main`** run **`npm run validate:release`** (see `.github/workflows/ci.yml`). CI sets **`TZ=America/Los_Angeles`** for Jest and uses a **20-minute** job timeout to cover Metro export.

## Configuration

- **Preset**: `jest-expo` (see `package.json` → `jest`).
- **Hook tests**: **`@testing-library/react-native`** + **`react-test-renderer`** (dev) for `renderHook` / `act` / `waitFor` on hooks such as **`useDayTodos`**.
- **TZ**: npm script sets `TZ=America/Los_Angeles` so date-heavy tests behave consistently on CI and local machines.
- **Watchman**: `watchman: false` in Jest config to avoid Watchman permission issues on macOS.

## Layout

- Co-located `*.test.ts` files live next to the modules under test (storage, utils, fault injection, demo seed, etc.).
- **`jest.setup.ts`**: shared setup (`<rootDir>/jest.setup.ts`).

## Scope

Tests focus on:

- Local date helpers and ISO key validation (`src/lib/utils/date.test.ts`).
- Calendar day-key helpers (`src/lib/utils/dateKeys.test.ts`).
- Month model + mood mapping (`src/lib/calendar/monthModel.test.ts`).
- Entry record validation (`src/data/model/entry.test.ts`).
- Calendar snapshot loader (`src/data/storage/calendarSnapshot.test.ts`).
- **`src/hooks/useDayTodos.test.tsx`**: `renderHook` (**`@testing-library/react-native`**) + AsyncStorage reset + **`resetDayTodosStorageSessionStateForTests`** — parallel adds, focus gating, serialized mutations.
- **`src/lib/todos/taskModel.test.ts`**: `nextRecurrenceDate` month-end, daily, weekdays, weekly + `weekdays[]`, biweekly interval.
- Goals/tasks foundation storage (`src/data/storage/goalsStorage.test.ts`, `src/data/storage/tasksStorage.test.ts`) covers defensive copies, progress/streaks, lightweight summaries, day Reminder shards, bounded recurrence generation, restart duplicate prevention, and legacy day-todo migration.
- Storage parsing, corruption quarantine, write ordering, storage fault injection (`src/data/storage/*.test.ts`).
- Storage stress: defensive cache copies, warmed derived caches, future-schema write blocking, dense day-todo preservation (`npm run test:storage-stress`).
- Long-running soak harness (`npm run test:soak`) repeatedly simulates Today, Goals, Reminders/To-Do, Journal, Calendar, Settings, storage reloads, recurrence generation, and data validation while tracking memory, app hot-path timings, validation harness timings, slow calls, and failures in `SOAK_TEST_REPORT.md`.
- Utilities such as frame coalescing / debounce helpers where present.

React screens are exercised manually and via lint/tsc rather than snapshot-heavy component tests today. Hooks with storage side effects use **`renderHook`** in a small number of focused tests (see **`useDayTodos`**).
