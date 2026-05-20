## Calendar performance playbook (current)

This document describes Kairo’s calendar hot paths and the “rules of engagement” for keeping `CalendarScreen` and `CalendarView` Apple Calendar–smooth **without changing UI/UX**.

### Goals
- **60fps-feeling scroll** in the month timeline (`CalendarScreen`) and year pager (`CalendarView`)
- **Instant taps** (day tap → modal open; month tap in year view)
- **No main-thread hitches** from avoidable JS work during scroll/transition
- **No payload logs** (notes/entries/settings are never logged)

---
### Current strategy (what’s implemented)

#### Month timeline (`CalendarScreen`)

- Uses **FlashList** for the month timeline.
- **Card width measurement** (`onCalendarCardInnerLayout`) is **coalesced** (one `requestAnimationFrame` per frame max), **ignored while the user is actively scrolling** (writes go to a pending ref), and **flushed when the scroll gesture completes** — so recycling rows cannot spam `setMeasuredCalendarInnerW` and rebuild **all** month row heights every frame (a common “scroll freeze” cause).
- Uses a **large mostly-static month window** (~100 years; `WINDOW_CAP = 1201`, offsets `-600..600`) to avoid periodic “window shift” freezes.
- Only extends the window near extreme edges; extension/recenter work is deferred via `InteractionManager.runAfterInteractions`.
- Viewability callbacks avoid React state churn during active scroll (refs only).
- **Data load**: **`fetchMoodCalendarSnapshot`** on focus (deferred via **`InteractionManager.runAfterInteractions`**) pulls **entries-by-month index + settings** in one parallel, coalesced read (`calendar.loadData` perf event in dev).
- **Month rows**: **`CalendarTimelineMonth`** (`React.memo` + `timelineMonthPropsEqual`) is the production row component; **`selectedDateRef`** keeps **`renderMonthItem`** stable across day taps while **`extraData`** still carries `selectedDate` for recycled rows.
- **Recycle epoch**: **`calendarListEpoch`** bumps only when local **today** changes across blur (`didLocalTodayChangeAcrossBlur`) or at midnight while focused — not on every tab focus.
- **FlashList sizing**: **`overrideItemLayout`** uses **`computeMonthTimelineRowHeights`** (5- vs 6-week months) from `src/lib/calendar/timeline/flashListLayout.ts` (re-exported via **`src/utils`**).
- **Deferred work**: window extend / recenter **`InteractionManager`** tasks are **cancelled on blur** and guarded with **`isFocusedRef`** so hidden tabs do not apply stale list mutations.

#### Year pager (`CalendarView`)

- Horizontal **FlatList paging** with memoized `YearPage` + `MiniMonthCard` to avoid rerender storms.
- Month taps are **coalesced** (last tap wins; at most one navigate per frame) to prevent transition stacking while the pager settles.

#### Grid hot path (`MonthGrid` / `DayCell`)

- `getMonthMatrix(year, monthIndex0)` is globally cached and frozen (stable references).
- `getMonthRenderModel(...)` caches per-month derived arrays:
  - ISO keys by day
  - mood color by day
  - “has note” by day
  - stable per-day press handlers (WeakMap/Map caches)
- Empty-month fast path reuses shared frozen arrays (no per-day loops/allocations).
- Mini grids avoid mounting `Pressable` when there’s no `onPress` handler.
- “Today” is passed in as `todayKey` from screens via `useTodayKey()` (updates across midnight without polling).

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
- Calendar screens flush on focus-exit (blur) (dev-only):
  - `CalendarScreen.unmount` (month timeline tab)
  - `CalendarView.blur` (year overview stack screen)
- **Settings** flushes `SettingsScreen.blur`.
- Journal / Goals / per-day Reminders (`TodoScreen`) also flush once per focus session on blur (same `didFlush` guard pattern as the calendar tab) so you can pair **stress runs** with a clean `perf.report` when leaving the screen.

### Physical QA matrix (pair with `perf.report`)

Run on a **real device** in dev (Metro). After each scenario, **leave the screen** (blur) so `perf.report` emits; compare `phases`, `last`, and `crumbs`.

| Scenario | What to watch |
|---|---|
| **Reduce Motion** on (Settings → Accessibility mirrors device) | Month timeline peek-fade path disabled; no new `perf.hitch` clusters vs baseline. |
| **Reduce Transparency** on | No extra list diffing; same scroll/tap phases. |
| **Large entry counts** (seed / long history) | `list.journal` / `list.calendarMonthTimeline` profiler summaries; FlashList `extraData` churn. |
| **Rapid tab / year / month / day** | `CalendarScreen.scroll` vs `CalendarScreen.dayTap` in hitches; day tap should not attribute to scroll. |
| **Background → foreground** during save | Modal save phase; no stuck `culpritPhase` after resume. |

#### Hitch detector
Event:
- `perf.hitch` when requestAnimationFrame delta \(> 24ms\)

Fields (metadata-only):
- `deltaMs`
- `culpritPhase` (a short tag set by screens during key phases)

Typical culprit phases:
- `CalendarScreen.scroll` (finger / momentum on the month timeline)
- `CalendarScreen.windowExtend` / `CalendarScreen.recenter` (deferred edge expansion + `scrollToIndex` realignment — still scroll-pipeline work; included in the dev-only `calendar.slowFrame` classifier alongside raw scroll)
- `CalendarScreen.dayTap` (tap path; should **not** be tagged as scroll — set in **`CalendarScreen`** day handler or shared **`useCalendarDayPress`** hook)
- `CalendarScreen.modalSave`
- `CalendarScreen.buildMonthWindow`
- `CalendarView.scroll`
- `CalendarView.load`

#### CalendarScreen markers
Events:
- `calendar.screen.mount` / `calendar.screen.unmount`
- `calendar.loadData` (unified snapshot: month index + settings; replaces separate `calendar.loadEntries` / `calendar.loadSettings`)
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

Optional **worst-case list** profiling (device, local-only): temporarily widen the anchored month window in `src/lib/calendar/timeline/constants.ts` / `CalendarScreen` initial offsets while keeping `renderMonthItem`, `extraData`, and `setCulpritPhase` tags unchanged; compare `perf.listRenderSummary` and hitch phases, then revert before shipping.

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
- **Avoid `new Date()` inside loops** (`todayKey` comes from screens; month matrix is cached).
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

### List surface colors (recycler views)

**FlashList** / **AnimatedFlashList** default surfaces can briefly appear **white** if no explicit background is set — painful in dark mode and during first paint.

- **`CalendarScreen`**: `AnimatedFlashList` uses a **`style`** aligned with `system.secondaryBackground` (same family as the screen container).
- **`JournalScreen`**: FlashList **and** FlatList fallback receive **`flex: 1`** plus **`system.background`**.
- **`CalendarView`**: horizontal year **`FlatList`** uses the memoized **`screenStyle`** (`flex: 1` + `system.background`).

### Rollback notes
All calendar perf changes are intended to be small and reversible. Prefer removing one optimization at a time and re-checking `perf.report` rather than rewriting large chunks.

