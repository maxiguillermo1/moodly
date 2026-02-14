## Moodly performance baseline (dev-only probes)

This document is **generated/filled** by running the app in **DEV** and capturing the structured PERF logs emitted by `src/perf/*`.

### Constraints honored
- **No UI/UX changes** (probes do not render views)
- **No feature/navigation changes**
- **No storage semantic changes**
- **Expo Go compatible**
- **Metadata-only logs** (no notes/entries/settings payloads)

---

## How to collect the baseline (2–3 minutes)

1) Start the app in dev:

```bash
npm run start
```

2) Clear Metro logs (optional), then do one cold-ish run:
- Fully close the app (swipe away).
- Re-open it.
- Wait until the UI feels “ready” (no obvious transition jank).

3) Navigate through the key flows once:
- **Today** → **Calendar** → open **Year view** → tap a month (back to Month view)
- **Journal** → scroll a bit
- Open **Settings** modal → close it

Tip: leave Calendar screens (blur) after you interact so you capture `perf.report` summaries.

4) Copy the **PERF** lines from the dev console and paste summary numbers below.

---

## What the probes measure (events)

All events are emitted via the structured `logger.perf(...)` API.

- **Startup**
  - `perf.appStart`: app-level start mark (dev-only)
  - `perf.navReady`: NavigationContainer ready (approx “navigation mounted”)
  - `perf.firstInteractionReady`: after `InteractionManager.runAfterInteractions` in `RootApp`

- **Navigation**
  - `perf.navRouteChange`: route name change (best-effort; nested navigators supported)
  - `perf.navToFocus`: routeChange → target screen focus (best-effort)
  - `perf.navTransition`: transitionStart → transitionEnd when navigator emits these events (best-effort)

- **Screen readiness**
  - `perf.screenInteractionReady`: screen focus → afterInteractions (approx “ready for smooth interaction”)

- **List render cost**
  - `perf.listRenderSummary`: React Profiler summary for key lists
 - **Hitch summary (calendar hot paths)**
   - `perf.report`: aggregated hitch summary flushed on Calendar screen blur
     - includes `phases[]` with `p95Ms/maxMs`
     - classifies unattributed stalls as `DEV_METRO_OR_GC` (Metro/GC/tooling)
    - `maxActualMs`: worst commit cost observed during focus window
    - `avgActualMs`: average commit cost observed during focus window
    - `commits`: number of commits recorded (higher can indicate churn)

---

## Device / runtime info (auto-logged)

The probe logs `perf.deviceInfo` once per dev session. Paste it here:

- **platform**:
- **platformVersion**:
- **hermes**:
- **winW / winH**:
- **pixelRatio**:

---

## Baseline measurements (fill from logs)

### Startup (cold)
- **navReady** (`perf.navReady.durationMs`): ____ ms
- **firstInteractionReady** (`perf.firstInteractionReady.durationMs`): ____ ms

### Navigation transitions (typical)
Fill 2–3 representative samples from logs.

- **Today → Calendar**:
  - `navToFocus`: ____ ms
  - `navTransition` (if present): ____ ms

- **CalendarScreen → CalendarView (year grid)**:
  - `navToFocus`: ____ ms
  - `navTransition` (if present): ____ ms

- **CalendarView → CalendarScreen (month)**:
  - `navToFocus`: ____ ms
  - `navTransition` (if present): ____ ms

- **Any tab switch (Calendar/Today/Journal)**:
  - `navToFocus`: ____ ms

### Worst-case list render cost (key screens)
Paste `perf.listRenderSummary.lists` numbers here.

- **CalendarScreen month timeline** (`list.calendarMonthTimeline`):
  - commits: ____
  - maxActualMs: ____
  - avgActualMs: ____

- **CalendarView year pager** (`list.calendarYearPager`):
  - commits: ____
  - maxActualMs: ____
  - avgActualMs: ____

- **Journal list** (`list.journal`):
  - commits: ____
  - maxActualMs: ____
  - avgActualMs: ____

---

## Top suspected hot paths (initial hypotheses)

These are **suspects** to validate with the baseline numbers above.

- **Journal list virtualization + commit cost** (`src/screens/JournalScreen.tsx`)
  - Large, unbounded list; render cost scales with entry count.

- **CalendarScreen month timeline commits** (`src/screens/CalendarScreen.tsx`)
  - Heavy month item subtree (MonthGrid); even with bounded months, commit cost can spike.

- **CalendarView year grid pager** (`src/screens/CalendarView.tsx`)
  - Horizontal pager; subtle stutters can come from expensive mini-month rendering.

