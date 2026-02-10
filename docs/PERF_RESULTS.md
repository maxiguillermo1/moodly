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

- **Change 1 (implemented)**:
  - **What**: Add a reversible toggle to run Journal as `FlatList` (baseline) or `FlashList` (experiment) in `src/screens/JournalScreen.tsx`
  - **Why it should help**: Better virtualization + lower memory pressure on large lists, reducing scroll hitching and big render commits.
  - **Rollback**: Set `JOURNAL_LIST_IMPL` back to `'flatlist'` (no other code changes).

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

