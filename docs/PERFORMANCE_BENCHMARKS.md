# Moodly Performance Benchmarks

Point-in-time benchmark and validation notes for the foundation-hardening pass. Pair with [`PERFORMANCE.md`](./PERFORMANCE.md), [`PERFORMANCE_NOTES.md`](./PERFORMANCE_NOTES.md), and [`perf-calendar.md`](./perf-calendar.md).

## Automated Gate Results

Run from the repo root:

| Command | Result | Notes |
|---------|--------|-------|
| `npm run typecheck` | Passed | Strict TypeScript compile check. |
| `npm run lint` | Passed | ESLint production guardrails, including local-day key rule. |
| `npm test` | Passed | Includes persistence, calendar/date, extension registry, storage corruption, and utility coverage. |
| `npm run test:storage-stress` | Passed | Included in release gates; mood/day Reminder/task/goals/persistence stress and corruption coverage. |
| `npm run doctor` | Passed | Expo Doctor `17/17 checks`. |
| `npm run export:bundles-check` | Passed | Metro export for iOS and Android. |
| `npm audit --omit=dev --audit-level=moderate` | Passed | Production dependency audit reports `0 vulnerabilities`. |

Bundle export output:

| Platform | Bundle | Size |
|----------|--------|------|
| iOS | Hermes bytecode | `4.27 MB` |
| Android | Hermes bytecode | `4.28 MB` |

## Foundation-Hardening Observations

- Calendar date-key behavior remains local-calendar based and is covered for invalid days, leap day, DST transition dates, local midnight timing, and route date restoration.
- Calendar navigation keeps the same UI/UX while now updating selected day state when an already-mounted screen receives new month/day params.
- Route date params are authoritative for both selected day and anchor month, avoiding split scroll/selection state. Already-applied route params do not replay over a user-selected day during later timeline window changes.
- Year overview can recenter its fixed-size year window when route params target a year outside the initial range, keeping the header and visible page aligned.
- Calendar snapshots preserve stable month-map references until entries actually change, reducing no-op focus reload rerenders.
- Calendar timeline virtualizer sizing uses viewport height rather than total content height, improving render-window decisions for long timelines.
- Deferred calendar recenter/window-extension work is cancellable and focus-guarded to prevent hidden-screen state updates.
- Journal focus reloads avoid no-op state replacement when sorted entries are semantically unchanged.
- Extension rendering remains registry-driven. Visibility toggles and tracked-habit visibility are treated as configuration; per-day values remain intact.
- Day Reminder and habit caches protect against stale cold-load promises overwriting newer writes.
- Task day APIs now use `moodly.tasks.day.YYYY-MM-DD` shards plus a small day index, so Today/Todo reads and one-day mutations avoid full task-record scans and rewrites.
- Legacy `moodly.dayTodos` migration persists its `moodly.tasks` marker during the cold read and derives migrated ids from both date and legacy id, preventing repeated migration work and cross-day id collisions.
- Task recurrence uses local calendar-day iteration with weekday matching and month-end clamping, avoiding UTC drift, skipped weekdays, and Jan 31-style overflow.
- Goal writes are normalized at the storage boundary: invalid dates/non-finite values are rejected, history/milestone arrays are bounded, and summary selectors avoid cloning full history/milestone arrays for Today/list rendering.
- Today Goals reads lightweight goal summaries, no longer reloads the full goal store on unrelated date prop changes, and exposes a more informative accessibility label without changing visuals.
- Recurrence generation is bounded and incremental: each tick processes a small number of due templates, persists `lastGeneratedDate`, and guards against duplicate occurrences after restart.
- Closed calendar edit sheets no longer mount day extension slots, avoiding hidden storage reads and extension ordering work while the modal is not visible.
- Persistence writes are serialized per store and now blocked after bootstrap failure or future on-disk schema detection, preventing accidental overwrite of newer local data.
- Entry/settings cache reads return defensive copies, preventing caller mutation from creating long-session RAM/data desync.
- Error recovery and Reduce Motion behavior were refined without visual redesign: Calendar stack transitions now respect Reduce Motion, and the app error boundary remounts the subtree on retry.
- Today save-message timers and recycled-list epoch microtasks are guarded so delayed callbacks do not update unmounted screens.

## Scale Targets For Manual Profiling

Use these as release-candidate smoke targets on the oldest supported iPhone and one modern iPhone:

| Scenario | Target |
|----------|--------|
| Mood history | 5,000 to 10,000 local day entries across many years. |
| Journal history | Thousands of notes with mixed note lengths. |
| Calendar navigation | Rapid month timeline scroll, year paging, month open/close, and repeated day selection. |
| Extensions | Repeated Habits/Goals/Reminders toggling; dense day todo lists up to the storage cap; tracked habit hide/show cycles. |
| Goals + Tasks | 100 goals, long goal histories, 1,000 dated tasks across a year, archived/completed tasks, and recurrence generation around weekends/month ends. |
| Long session | 30+ minutes active use with tab switches, modal open/close, app background/foreground, and local midnight rollover. |

Release-blocking thresholds for the first production foundation:

| Check | Target |
|-------|--------|
| Cold open after 5k mood entries | No crash; Today interactive after first paint; Calendar/Journals hydrate without blocking navigation. |
| Calendar scroll with 10k entries | No visible blanking during normal month scroll; no progressive hitching after repeated year/month jumps. |
| Journal scroll with 5k notes | Rows remain responsive; edit/delete returns to a consistent list without stale rows. |
| Save latency under large local blobs | Mood save and one-day todo mutation complete without duplicate rows or lost updates; day Reminder actions should mutate only the active day shard. |
| Memory behavior | No visible degradation after 30+ minutes of tab switches, calendar scroll, modal cycles, and background/foreground. |
| Low-memory / OS kill | Relaunch restores persisted mood, journal, settings, and extension data; no in-memory-only state is trusted. |

## Repeatable Commands

```bash
npm run validate
npm run test:storage-stress
npm run validate:release
```

`validate:release` is the local equivalent of CI and includes Expo Doctor plus all-platform bundle export.

## Remaining Bottlenecks Before Future Scale

- Large mood and journal histories still live in full AsyncStorage JSON blobs. This is acceptable for the first production foundation, but SQLite/month sharding should be considered before backend sync or very large imported histories.
- Day-scoped Reminders are now sharded by local day, while `moodly.tasks` remains the normalized metadata/recurrence record. Goals remain a normalized JSON payload with read-optimized summaries. True Instagram/Spotify-scale histories still require SQLite/sharded stores before cloud sync or import/export growth.
- Calendar derived indexes are session caches over local blobs. They are fast for current local-first scope, but future sync/import flows should benchmark cold load and incremental invalidation under 10k+ rows.
- Physical-device profiling is a release evidence requirement, not an automated-code blocker: true frame pacing, memory growth, keyboard transitions, haptics, VoiceOver focus, and low-memory behavior must be recorded from TestFlight/release-style builds using the matrix in `RELEASE_CHECKLIST.md`.
- Defensive copying adds small object allocation cost to public entry/settings reads. This is intentional for cache integrity; profile again before raising large-history targets or adding sync/import.

SQLite/sharding trigger points for the next phase:

- Any single AsyncStorage payload approaches platform-specific practical limits or causes save latency that is visible in normal use.
- Calendar or Journal cold hydration with 10k local rows feels blocking on the oldest supported device.
- Sync/import, multi-device merge, or bulk restore is introduced.
- Dense extension data grows beyond the per-day caps and starts requiring cross-day queries.

## Future Recommendations

- Before the next scaling phase, add a repeatable on-device stress harness for synthetic multi-year data, app relaunch loops, background/foreground cycles, and extension toggling.
- Introduce persisted key envelopes or per-key schema versions when the first real shape-changing migration appears.
- Move to SQLite or a sharded local store before adding sync/import features that can multiply local history size.
