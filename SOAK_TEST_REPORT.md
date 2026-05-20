# Kairo Soak Test Report

Status: stopped

## Summary

| Metric | Value |
|---|---:|
| Started | 2026-05-12T06:57:12.600Z |
| Runtime minutes | 0.29 |
| Total loops completed | 700 |
| Stop reason | SOAK_MAX_LOOPS=700 |
| Profile | hot-path |
| Fatal | no |
| Failures | 0 |
| Slow operations | 0 |

## Data Snapshot

| Store | Count |
|---|---:|
| Mood/journal entries | 365 |
| Goals | 100 |
| Tasks | 1000 |
| Task history records | 480 |
| Completed tasks | 50 |
| Archived goals | 100 |

## Memory

| Snapshot | RSS MB | Heap Used MB | Heap Total MB | External MB |
|---|---:|---:|---:|---:|
| First | 222 | 61.4 | 148.9 | 5.2 |
| Latest | 497.6 | 380.1 | 492 | 5.1 |
| Growth | 275.6 | 318.7 | 343.1 | -0.1 |

## App Hot-Path Timings

| Operation | Count | Avg ms | Max ms | Slow >=100ms |
|---|---:|---:|---:|---:|
| entry.upsert | 700 | 0.3 | 2 | 0 |
| goal.archive | 100 | 0.4 | 1 | 0 |
| goal.complete | 483 | 0.3 | 2 | 0 |
| goal.edit | 700 | 0.3 | 1 | 0 |
| goal.targetProgress | 483 | 0.3 | 1 | 0 |
| goal.undoCompletion | 483 | 0.3 | 1 | 0 |
| goals.create | 100 | 0.1 | 1 | 0 |
| goals.load | 750 | 0.1 | 1 | 0 |
| recurrence.generate | 700 | 2.8 | 5 | 0 |
| screen.calendar.load | 700 | 0.0 | 1 | 0 |
| screen.goals.load | 700 | 0.3 | 7 | 0 |
| screen.journal.load | 700 | 0.2 | 1 | 0 |
| screen.settings.load | 700 | 0.1 | 1 | 0 |
| screen.today.load | 700 | 0.2 | 1 | 0 |
| screen.todo.load | 700 | 0.0 | 1 | 0 |
| settings.bootstrap | 1 | 2.0 | 2 | 0 |
| todo.add | 139 | 0.1 | 1 | 0 |
| todo.complete | 565 | 0.0 | 1 | 0 |
| todo.pageAdd | 139 | 0.2 | 1 | 0 |
| todo.pageComplete | 139 | 0.0 | 0 | 0 |
| todo.pageDelete | 46 | 0.0 | 0 | 0 |
| todo.undoComplete | 565 | 0.0 | 1 | 0 |

## Validation Harness Timings

| Operation | Count | Avg ms | Max ms | Slow >=100ms |
|---|---:|---:|---:|---:|
| app.reloadState | 700 | 2.7 | 6 | 0 |

## Recent Slow Operations

| Timestamp | Loop | Operation | ms |
|---|---:|---|---:|
| n/a | 0 | n/a | 0 |

## Recent Failures

| Timestamp | Loop | Action | Message |
|---|---:|---|---|
| n/a | 0 | n/a | none |

## Coverage Notes

- Simulates Today, Goals, Reminders/To-Do, Journal, Calendar, Settings, storage reloads, recurrence generation, and validation checkpoints.
- Uses Jest AsyncStorage mock only. It is safe for overnight local runs and does not mutate real simulator/device app data.
- `SOAK_PROFILE=hot-path` skips full validation passes so timings reflect user-facing loads/writes more directly.
- UI render counts and native memory/frame pacing still require a device/E2E harness; this soak runner records screen-load proxy timings through the same storage/domain paths those screens use.

## Recommendations

- Investigate any repeated failures or operations with growing max/average times.
- If RSS or heap grows monotonically across long runs, capture a Node heap snapshot or reproduce with a native E2E harness.
- Before cloud sync or large import/export, keep using this runner with higher loop counts and add SQLite/sharding benchmarks.
