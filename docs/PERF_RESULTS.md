## Moodly performance results (before vs after)

This document compares **baseline** probe numbers (`docs/PERF_BASELINE.md`) to **post-change** probe numbers, using the same `src/perf/*` logs.

### Constraints honored
- **No UI/UX changes**
- **No feature/navigation changes**
- **No storage semantic changes**
- **Expo Go compatible**
- **Metadata-only logs**

---

## Changes evaluated

- Use this doc as a **PR-friendly template** when you ship a performance change.

Example of an existing “reversible switch” in the repo:
- `src/features/journal/screens/JournalScreen.tsx` has `JOURNAL_LIST_IMPL: 'flatlist' | 'flashlist'`
  - Default is currently **`'flashlist'`** (verify in source when comparing numbers)

  - Rollback is a one-line change back to `'flatlist'`

---

## Before vs After metrics

### Foundation hardening validation record

Latest automated release gate:

| Gate | Result |
|---|---|
| `npm run validate:ios-release` | Passed |
| Jest | `30` suites, `130` tests passed |
| Storage stress | `5` suites, `39` tests passed |
| Expo Doctor | `17/17` checks passed |
| iOS export | Passed |
| Production dependency audit | `0 vulnerabilities` |

Device FPS/memory numbers still require physical-device capture before App Store submission; use [`PERFORMANCE_BENCHMARKS.md`](./PERFORMANCE_BENCHMARKS.md) for release-blocking thresholds.

### Goals + Tasks performance/data audit record

Latest post-foundation audit fixes:

| Area | Result |
|---|---|
| Legacy Reminder migration | Date-scoped migrated ids prevent cross-day collisions; migration marker persists immediately to avoid repeated cold-start work. |
| Task recurrence | Weekly weekday rules and month-end recurrence now use deterministic local-date logic; generation is bounded, persists `lastGeneratedDate`, and has restart duplicate-prevention coverage. |
| Task day storage | Day-scoped Reminders now use `moodly.tasks.day.YYYY-MM-DD` shards plus a day index, so Today/Todo day loads and mutations avoid global task scans/rewrites. |
| Goal storage writes | Invalid dates and non-finite progress values are rejected/sanitized; long history/milestone arrays are bounded. |
| Goal summaries | Today Goals reads lightweight summaries, avoiding full goal history/milestone cloning and duplicate streak scans on preview rendering. |
| Soak profiling | Reports now split app hot-path timings from validation harness timings; `SOAK_PROFILE=hot-path` skips full validation scans for user-facing measurements. |

Latest 700-loop hot-path soak (`SOAK_PROFILE=hot-path SOAK_MAX_LOOPS=700 SOAK_INTERVAL_MS=1 SOAK_CLEANUP=1 npm run test:soak`):

| Metric | Result |
|---|---:|
| Failures | `0` |
| Slow operations >=100ms | `0` |
| Tasks at cap | `1,000` |
| Today load avg/max | `0.2ms` / `1ms` |
| To-Do day load avg/max | `0.0ms` / `1ms` |
| To-Do add avg/max | `0.1ms` / `1ms` |
| Recurrence generation avg/max | `2.8ms` / `5ms` |
| Harness reload avg/max | `2.7ms` / `6ms` |

### Startup (cold)
| Metric | Before | After | Δ |
|---|---:|---:|---:|
| navReady (ms) |  |  |  |
| firstInteractionReady (ms) |  |  |  |

### Navigation transitions (typical)
| Transition | Metric | Before | After | Δ |
|---|---|---:|---:|---:|
| Today → Calendar | navToFocus (ms) |  |  |  |
| CalendarScreen → CalendarView | navToFocus (ms) |  |  |  |
| CalendarView → CalendarScreen | navToFocus (ms) |  |  |  |
| Tab switch (any) | navToFocus (ms) |  |  |  |

### Worst-case list render cost (key screens)
| Screen/list | commits | maxActualMs | avgActualMs |
|---|---:|---:|---:|
| CalendarScreen (`list.calendarMonthTimeline`) |  |  |  |
| CalendarView (`list.calendarYearPager`) |  |  |  |
| Journal (`list.journal`) |  |  |  |

---

## Decision (keep or revert)

- **Keep?**: YES / NO
- **Reason**:
- **Any regressions noticed**:

---

## Validation checklist (must all pass)

- **Today**: save/update still works
- **Journal**: scroll smooth + edit/delete works
- **Calendar**: year/month scroll + tap day + save works
- **Settings**: stats correct + toggles persist
- **Privacy**: no sensitive logs (notes/entries/settings payloads never logged)

