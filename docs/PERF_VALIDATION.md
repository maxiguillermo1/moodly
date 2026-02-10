## Moodly perf-change validation checklist

Use this checklist after any performance-only change (including library swaps).

### Functional checks (no behavior regressions)
- **Today**: pick mood + add note + Save → relaunch app → entry persists
- **Journal**: scroll is smooth → tap entry → edit mood/note → Save → change persists
- **Journal delete**: long-press entry → Delete → entry removed
- **Calendar (month)**: scroll months → tap day → Save → indicator updates → relaunch persists
- **Calendar (year)**: open year grid → swipe years → tap month → lands on correct month
- **Settings**: stats populate correctly; toggles persist after relaunch

### Perf probe checks (dev-only, metadata-only)
- Confirm you see PERF events like:
  - `perf.navReady`, `perf.firstInteractionReady`
  - `perf.navRouteChange`, `perf.navToFocus`
  - `perf.listRenderSummary` (CalendarScreen/CalendarView/Journal)
- Confirm **no sensitive logs**:
  - No journal notes
  - No full entries objects
  - No settings blobs

