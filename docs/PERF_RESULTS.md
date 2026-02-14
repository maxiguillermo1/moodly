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
- `src/screens/JournalScreen.tsx` has `JOURNAL_LIST_IMPL: 'flatlist' | 'flashlist'`
  - Default is currently `'flatlist'`
  - Rollback is a one-line change back to `'flatlist'`

---

## Before vs After metrics

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

