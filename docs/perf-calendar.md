## Calendar performance deep dive (Phase 1)

This document describes Moodly’s calendar hot paths and the “rules of engagement” for keeping `CalendarScreen` and `CalendarView` Apple Calendar–smooth **without changing UI/UX**.

### Goals
- **60fps-feeling scroll** in the month timeline (`CalendarScreen`) and year pager (`CalendarView`)
- **Instant taps** (day tap → modal open; month tap in year view)
- **No main-thread hitches** from avoidable JS work during scroll/transition
- **No payload logs** (notes/entries/settings are never logged)

### Dev-only instrumentation (what to look for)
All instrumentation is dev-only and uses the structured logger.

#### Perf report (aggregated summary)
Event:
- `perf.report` emitted by `perfProbe.flushReport(reason)`

What it contains (metadata-only):
- Total hitch count for the session
- Per-phase counts + `maxMs` + approximate `p95Ms`
- A rolling “last N” hitch list (timestamp, phase, delta)

Where it is emitted:
- Calendar screens flush on unmount (dev-only):
  - `CalendarScreen.unmount`
  - `CalendarView.unmount`

#### Hitch detector
Event:
- `perf.hitch` when requestAnimationFrame delta \(> 24ms\)

Fields (metadata-only):
- `deltaMs`
- `culpritPhase` (a short tag set by screens during key phases)

Typical culprit phases:
- `CalendarScreen.scroll`
- `CalendarScreen.dayTap`
- `CalendarScreen.modalSave`
- `CalendarScreen.buildMonthWindow`
- `CalendarView.scroll`
- `CalendarView.load`

#### CalendarScreen markers
Events:
- `calendar.screen.mount` / `calendar.screen.unmount`
- `calendar.loadEntries` (AsyncStorage/session-cache load timing)
- `calendar.loadSettings`
- `calendar.monthWindow.build` (month window array build timing)
- `calendar.visibleMonth.commit` (throttled/guarded visible month commits)
- `calendar.dayTapToModalOpen` (tap → modal visible)
- `calendar.modalSave.success` / `calendar.modalSave.failed`

#### CalendarView markers
Events:
- `calendar.yearView.mount` / `calendar.yearView.unmount`
- `calendar.yearView.load`
- `calendar.yearView.page` (page/year selection on momentum end)
- `calendar.yearView.momentumEnd` (event emitted after momentum ends; correlate with hitches)

#### List render cost (React Profiler summary)
Event:
- `perf.listRenderSummary`

This is emitted after interactions by `usePerfScreen` and summarizes commit durations recorded by `PerfProfiler` ids:
- `list.calendarMonthTimeline`
- `list.calendarYearPager`

### Measurement recipe (2 minutes)
1) Run the app in dev and open the calendar screens.
2) Watch logs for:
   - `perf.hitch` clusters + `culpritPhase`
   - `perf.listRenderSummary` (max/avg commits)
   - `calendar.dayTapToModalOpen` and `calendar.modalSave.*`
3) Record a short “before/after” snapshot (same device, same dataset).

Suggested table to paste into a PR/summary:

| Metric | Before | After |
|---|---:|---:|
| Worst `perf.hitch` deltaMs (CalendarScreen.scroll) |  |  |
| `perf.report` hitches (CalendarScreen.scroll count, p95Ms) |  |  |
| `calendar.monthWindow.build` durationMs |  |  |
| `perf.listRenderSummary` maxActualMs (month timeline) |  |  |
| `calendar.dayTapToModalOpen` durationMs |  |  |
| Worst `perf.hitch` deltaMs (CalendarView.scroll) |  |  |
| `perf.report` hitches (CalendarView.scroll count, p95Ms) |  |  |
| `perf.listRenderSummary` maxActualMs (year pager) |  |  |

### Hot paths and rules of engagement

#### `MonthGrid` / `DayCell` (hottest path in the app)
Rules:
- **No per-cell string building** (ISO keys must be precomputed once per month).
- **No per-cell handler allocations** (precompute per-day handlers once per month).
- **No per-cell `useMemo`** (compute shared style objects once per grid and pass them down).
- **Avoid `new Date()` inside loops** (today key is computed once; month matrix is cached).
- **Pass only what a cell needs** (avoid passing whole entry records if not required).
- **DayCell props should be primitives** (strings/numbers/booleans + stable handler). Avoid passing objects/arrays/styles.

#### `CalendarScreen` (month timeline)
Rules:
- **Stabilize list props**: `keyExtractor`, `renderItem`, `viewabilityConfig`, layout handlers.
- **Avoid state writes during scroll**: use refs for transient scroll state; throttle/guard visible month commits.
- **Do not allocate `{}` for empty months**: use a frozen shared empty map.
- **Measure before changing**: add markers around month-window build, day tap, modal open/save.

#### `CalendarView` (year pager)
Rules:
- **Paging must not re-render storms**: memoize `renderItem` and avoid inline style objects in the 12-month grid.
- **Avoid month-key helpers in tight loops**: precompute `YYYY-MM` keys cheaply.
- **No `{}` fallbacks per mini month**: use a shared frozen empty map.

### Rollback notes
All Phase 1 changes are intentionally small and reversible:
- Remove calendar markers and culprit tagging from `CalendarScreen` / `CalendarView`
- Remove hitch detector + `setCulpritPhase` from `src/perf/probe.ts`
- Revert `MonthGrid` precompute changes

