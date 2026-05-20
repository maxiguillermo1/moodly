# Moodly – Engineering Summary Log

**Product versioning:** The shipped app line is **Moodly v0.6** (**`0.6.0`** in `package.json` / `app.json` / `APP_RELEASE_VERSION`). See [`CHANGELOG.md`](./CHANGELOG.md) § Versioning and [`AGENTS.md`](./AGENTS.md) § Product maturity & versioning.  
**About this file:** Dated entries below are an **engineering log**; some older internal headings use “Version 0.x” labels from earlier passes — they are **not** a second source of truth for app semver.

## Changelog Index
- [2026-05-11 — Day extensions & Reminders](#2026-05-11--day-extensions--reminders)
- [2026-05-11 — Production hardening & release plumbing](#2026-05-11--production-hardening--release-plumbing)
- [2026-05-10 — Documentation synchronization + implementation alignment](#2026-05-10)
- [2026-02-03 — Version 0.5 — Core Foundation](#2026-02-03)
- [2026-02-04 — Version 0.5 — Logging & Observability (Privacy‑Safe, Structured)](#2026-02-04)
- [2026-02-11 — Version 0.6 — Internal Hardening (No UI changes)](#2026-02-11)

## Version Entry Template (copy/paste for future milestones)

### Version X.Y — Title (YYYY-MM-DD)

#### Why we did it (layman terms)
- [bullets]

#### Risks / problems discovered (ranked)
- **1)** …
- **2)** …

#### Fixes added (engineering summary)
- [bullets]

#### Files touched (high signal)
- [paths]

#### Failures prevented
- ✅ …

#### What remains intentionally out of scope
- …

#### Constraints confirmation
- ✅ No UI/UX changes
- ✅ No feature changes
- ✅ No storage schema/key/semantic changes
- ✅ Expo Go compatible

#### Quick validation checklist
- …

---

## 2026-02-03

### Version 0.5 — Core Foundation (2026-02-03)

> **Historical note:** This heading is an **internal milestone label** from February 2026. **Current** product line: **Moodly v0.6** (**`0.6.0`**). Older milestones (e.g. v0.5) remain in [`CHANGELOG.md`](./CHANGELOG.md) § Versioning and [`AGENTS.md`](./AGENTS.md) § Product maturity & versioning.

#### Why we did it (layman terms)
Moodly v0.5 is a local-first app with no accounts, backend, sync, or networking. This milestone focuses on foundations: clear layer boundaries, predictable data handling, privacy-safe logging, and performance hygiene in calendar hot paths.

Scope is intentionally limited to internal quality upgrades. The app’s UI/UX and behavior remain the same, while the codebase is made harder to misuse and more resilient to real-world device/storage conditions.

#### Risks / problems discovered (ranked)
- **1) Architectural drift via deep imports**: If screens/components import `src/lib/**` or `src/data/**` directly, they can bypass invariants/caches and create inconsistent patterns across the codebase.
- **2) Date-key semantics footguns (UTC vs local day)**: Using UTC-derived keys (e.g. `toISOString().slice(...)`) can silently shift entries across days near midnight/DST, causing “missing” or “moved” entries.
- **3) Corrupted local storage**: AsyncStorage can contain partial/invalid JSON; without hard boundaries, corruption can crash-loop or silently poison state.
- **4) Sensitive data leakage via logs**: Mood notes are sensitive; accidental logging of entries/settings blobs is an easy privacy incident vector.
- **5) Calendar hot-path regressions at scale**: Calendar grids and lists can degrade from small allocations/unstable props as dataset size grows to years of daily entries.

#### Fixes added (engineering summary)

##### Architecture
- **Beginner-friendly facades**: Introduced/confirmed stable import surfaces so the “right” imports are obvious:
  - `src/storage` for persistence APIs
  - `src/security` for safe logging/redaction/console patching
  - `src/domain` for pure rules + derived selectors (and shared date/mood helpers exposed intentionally)
- **App bootstrap clarity**: Centralized startup wiring in `src/app/RootApp.tsx` and exported from `src/app`.

##### Data (integrity + correctness)
- **Storage treated as untrusted**: Safe parsing + runtime validation at boundaries for entries and settings under `src/data/storage/*`.
- **Corruption quarantine**: On parse failures, raw values are quarantined and storage is reset to a safe default so the app stays usable.
- **Dev-only fail-fast**: In development, invalid date keys / moods / ranges throw early at the storage boundary to catch misuse before it ships.
- **Cache posture**: Added derived caches for common read patterns (sorted entries, entries-by-month) with explicit invalidation on writes.

##### Security (privacy by construction)
- **Privacy-safe logger**: Centralized logger with redaction; production defaults avoid verbose logs.
- **Console hardening**: `console.*` patched to reduce accidental leakage and align logging with redaction rules.
- **Guardrails against sensitive args**: Dev-only checks prevent logging payload-like blobs that resemble entries/settings/notes.

##### Performance (runtime posture)
- **Hot-path allocation hygiene**: Reduced per-render/per-cell allocations and stabilized styles/props in calendar components.
- **Navigation responsiveness**: Non-urgent work (e.g. demo seeding) is deferred so first paint is not blocked.

##### Docs (ownership + intent)
- **Folder READMEs**: Added short READMEs to `src/screens`, `src/storage`, `src/domain`, `src/security` to explain responsibilities and import expectations.
- **Architecture decision docs**: Added/updated docs describing layer rules, import direction, and key invariants (dates, storage, logging).

#### Files touched (high signal)
- `src/storage`
- `src/security`
- `src/domain`
- `src/app/RootApp.tsx`
- `src/data/storage/*`

#### Failures prevented
- **Deep imports from internals**: was possible in UI → now prevented by ESLint (screens/components/hooks must use facades).
- **UTC date-key derivation**: was easy to introduce → now prevented by ESLint (ban on `toISOString().slice(...)` for date keys).
- **Corrupt storage crash/poisoning**: was possible → now guarded by safe parsing + quarantine + defaults.
- **Sensitive payload logging**: was easy to accidentally do → now guarded by redaction, console patching, and dev-only assertions.
- **Calendar perf regressions**: was easy to re-introduce with inline objects/unstable props → now reduced via memoization and stable style/prop patterns in hot components.

#### What remains intentionally out of scope
- **Accounts/auth**: not built to keep local-first posture and avoid premature identity/security surface area.
- **Backend/sync/networking**: deferred; current foundation keeps data and boundaries structured for future additions without rewriting v0.5.
- **Encryption-at-rest**: deferred; would require explicit key management, threat model decisions, and performance tradeoffs.
- **Analytics UI / tracking**: not built; derived selectors exist for future use, but no instrumentation or UI exposure is added.

#### Constraints confirmation
- **No UI/UX changes**: layout, visuals, spacing, typography, navigation routes, and interactions were not changed as part of this foundation pass.
- **No feature changes**: no new screens/flows were added; work is limited to internal structure, guardrails, and safety/performance posture.
- **No data semantic changes**: storage keys and meaning remain the same; changes are validation, resilience, caching, and safer access patterns.

#### Quick validation checklist (1–2 minutes)
- Launch app → confirm no crashes and screens render immediately.
- Today: create/update entry → relaunch → confirm persisted.
- Journal: scroll → edit → delete → confirm list updates.
- Calendar: open year view → open a month → scroll months → tap a day → save → back.
- Settings: open → toggle available settings → relaunch → confirm persistence.

#### Notes (founder / portfolio framing)
This version demonstrates disciplined ownership of fundamentals: it enforces architecture boundaries, treats local data as production data, and defaults to privacy-safe behavior. The result is a repo that is easier to extend correctly under time pressure, while keeping product scope intentionally narrow.

The next milestones (0.6, 0.7) should follow the same posture: append-only decisions, guardrails over conventions, and only the minimum complexity required for the next constraint the product truly faces.

---

## 2026-02-04

### Version 0.5 — Logging & Observability (Privacy‑Safe, Structured) (2026-02-04)

#### Why we did it (layman terms)
- Make performance wins **provable** (cold vs warm loads) without guesswork.
- Keep logging **privacy-safe by default** (no user content; metadata only).
- Reduce “debug noise” by standardizing format, adding log budgets, and preferring summaries.
- Ensure production behavior stays **quiet and safe** (dev-only logs off; warnings rate-limited).

#### Risks / problems discovered (ranked)
- (Not separately recorded for this milestone; see “Why we did it (layman terms)”.)

#### Fixes added (engineering summary)
- Added a **structured logger** with **levels** (BOOT/PERF/CACHE/DATA/WARN/DEV/ERROR) and **channels** (`app`, `storage`, `session`, `calendar`, `journal`, `settings`) in `src/lib/security/logger.ts`.
- Enforced a **standard log shape**: `[LEVEL][channel] event { meta }` (no interpolated strings; metadata object only).
- Made **PERF/CACHE/DEV/BOOT/DATA dev-only**; allowed **WARN/ERROR in production** (metadata-only) with **WARN rate limiting**.
- Added a **log budget** (per session + per channel) with suppression notices to prevent runaway console noise.
- Updated console hardening (`src/lib/logging/patchConsole.ts`) to **silence non-logger logs** in prod while still allowing structured WARN/ERROR output.
- Replaced “stringy” logs (e.g. `"[moodStorage] ..."`) with **event + metadata** calls across storage/session/screens/hooks (no payload blobs).
- Added a **session cache snapshot** log (`CACHE session.ready`) including counts + derived cache list (no notes/entries content).
- Kept perf timing **dev-only** and added measured logs around key loads (Calendar/Journal/Settings/session warm).
- Updated legacy perf helpers (`src/lib/utils/devPerf.ts`) to emit structured PERF logs via the logger (still dev-only).

Example PERF line format (metadata-only):
`[PERF][calendar] calendar.loadData { phase: 'warm', source: 'sessionCache', durationMs: 1.6, monthsIndexed: 24 }`

#### Files touched (high signal)
- **storage/**
  - `src/data/storage/moodStorage.ts`
  - `src/data/storage/settingsStorage.ts`
  - `src/data/storage/sessionStore.ts`
  - `src/data/storage/demoSeed.ts`
- **screens/**
  - `src/features/calendar/screens/CalendarScreen.tsx`
  - `src/features/calendar/screens/CalendarView.tsx`
  - `src/features/journal/screens/JournalScreen.tsx`
  - `src/features/settings/screens/SettingsScreen.tsx`
- **security/logging/**
  - `src/lib/security/logger.ts`
  - `src/lib/logging/patchConsole.ts`
  - `src/lib/utils/devPerf.ts`
- **docs/**
  - `docs/logger.md`

#### Failures prevented
- (Implicit in the engineering summary above; this milestone standardizes privacy-safe logging and makes key performance paths measurable.)

#### What remains intentionally out of scope
- (Not separately recorded for this milestone.)

#### Constraints confirmation
✅ No UI/UX changes  
✅ No feature changes  
✅ No storage semantic/key changes  
✅ Expo Go compatible  

#### Quick validation checklist
- Today: save/update entry → relaunch → confirm persisted.
- Journal: list loads quickly → scroll → edit → save → confirm updates.
- Calendar: year swipe smooth → open month → scroll months → tap day → save → back.
- Settings: stats populate correctly and toggles still persist.
- Dev logs: confirm only metadata objects appear (no notes/entries/settings blobs).

#### Notes for v0.6+ (optional)
- Add **explicit “revalidate”** phase where/if we introduce background refresh.
- Centralize event naming conventions further (one place to list canonical events).
- Add a small **in-app dev-only export** of recent structured logs (still local-only, no network) if needed for audits.

---

## 2026-02-11

### Version 0.6 — Internal Hardening (No UI changes) (2026-02-11)

#### Why we did it (layman terms)
- Prevent “rare” edge cases (double taps, app backgrounding mid-save, slow storage) from turning into **data loss** or **crash loops**.
- Make the app resilient on old devices and under real-world chaos, without changing the product.

#### Risks / problems discovered (ranked)
- **Concurrent writes could silently lose data**: two overlapping entry writes could race and overwrite each other (last writer wins).
- **Failed writes could desync in-memory UI/cache from disk**: some flows updated RAM state before persistence completed.
- **Unhandled async errors from UI handlers**: async `onPress` paths could throw/reject without user-safe recovery.
- **Calendar fast-tap race**: rapid date taps could show the wrong entry in the edit sheet due to out-of-order async reads.
- **Settings toggle spam**: rapid switching could race writes and end in stale/incorrect persisted values.

#### Fixes added (engineering summary)
- **Write serialization** at the storage boundary:
  - Added a lightweight in-memory **write queue** for entries and settings so mutations are applied sequentially.
  - This prevents “lost updates” under double taps / multi-screen overlap.
- **Persist-first, then update caches**:
  - Storage now writes to AsyncStorage first and only then updates session RAM caches/derived indexes.
  - This prevents “looks saved but isn’t” states when persistence fails.
- **User-safe error handling**:
  - UI write handlers now **never throw** and instead show safe alerts on failure + emit redacted structured logs.
- **Calendar read race guard**:
  - Added a request-id guard so only the latest `getEntry()` result can populate the edit sheet.

#### Files touched (high signal)
- **storage (reliability)**
  - `src/data/storage/moodStorage.ts` (entries write queue + persist-first cache commits)
  - `src/data/storage/settingsStorage.ts` (settings write queue + persist-first cache commits)
- **screens (safe error handling / race guards)**
  - `src/features/calendar/screens/CalendarScreen.tsx` (save spam guard, never-throw save, stale read guard)
  - `src/features/journal/screens/JournalScreen.tsx` (catch delete/save failures)
  - `src/features/settings/screens/SettingsScreen.tsx` (catch toggle + clear failures, resync on error)

#### Failures prevented
- ✅ Silent data loss from overlapping writes (double-tap / multi-screen write races)
- ✅ Crash loops / unhandled promise rejections from async UI event handlers
- ✅ Calendar edit sheet showing the wrong day’s data after rapid taps
- ✅ Settings persisting stale values after toggle spam (writes are now serialized)
- ✅ “Saved in UI but not on disk” cache divergence on failed writes

#### What remains intentionally out of scope
- **Encryption at rest** (requires explicit threat model + key management)
- **System dark mode** (currently forced light mode via Expo config; enabling is a visible change)
- **Midnight/timezone policy** (define/implement “today rolls over while open” behavior explicitly)
- **Disk-full simulation + recovery UX** (we recover safely; richer UX is optional)
- **Future sync engine** (no networking in this milestone; only safe foundations)

#### Delta from previous version (v0.5 → v0.6)
- Added write serialization for entries and settings to prevent “last writer wins” races.
- Changed cache posture to persist-first so failed writes can’t leave RAM ahead of disk.
- Hardened UI write handlers to never throw and to recover with user-safe alerts.
- Added a Calendar stale-read guard so rapid taps don’t show the wrong day’s data.

#### Constraints confirmation
- **No feature changes** (no new screens/flows/routes; behavior on success paths unchanged)
- **No storage semantic/key changes** (`moodly.entries` / `moodly.settings` unchanged; only write safety added)
- **Expo Go compatible**

#### Quick validation checklist (2–5 minutes)
- Today: save/update entry → relaunch → confirm persisted.
- Journal: scroll → edit → save → long-press delete → confirm updates.
- Calendar: year → month → tap day → save → confirm updates (try fast taps).
- Settings: toggle both switches repeatedly → relaunch → confirm persisted.
- Simulate failure (optional): toggle airplane mode doesn’t matter; instead watch for no crashes on rapid interactions.

#### Migration note (v0.5 → v0.6)
v0.6 adds a reliability layer that makes storage writes **deterministic and race-safe** under real user behavior. The app remains local-first and feature-identical, but is significantly less likely to corrupt data or crash under chaos.

#### Phase 1 code links (exact functions changed)
- **Entries (write safety) — `src/data/storage/moodStorage.ts`**
  - `withEntriesWriteLock` (new): serializes all mutations
  - `upsertEntry` (updated): persist-first, then update caches
  - `deleteEntry` (updated): persist-first, then update caches
  - `clearAllEntries` (updated): persist-first, then clear caches
  - `setAllEntries` (updated): persist-first, then set caches
- **Settings (write safety) — `src/data/storage/settingsStorage.ts`**
  - `withSettingsWriteLock` (new): serializes settings writes
  - `setSettings` (updated): persist-first, then update cache (+ structured error log)
- **UI handlers (never crash-loop)**
  - `src/features/calendar/screens/CalendarScreen.tsx`: modal save `onPress` (no throw), `handlePressDate` (stale-read guard), save spam guard (`isSavingRef`)
  - `src/features/journal/screens/JournalScreen.tsx`: `handleSaveEdit`, delete confirm `onPress` (try/catch + user-safe alerts)
  - `src/features/settings/screens/SettingsScreen.tsx`: toggle `onValueChange` handlers + `handleClearData` (try/catch + resync)

---

### Calendar performance deep dive (Phase 1) (2026-02-11)

#### Why we did it (layman terms)
- Make Calendar scrolling/taps feel closer to Apple Calendar by removing avoidable JS work during scroll and by adding dev-only measurement so we can prove improvements.

#### Risks / problems discovered (ranked)
- **1) MonthGrid per-cell work**: avoidable string building and per-cell allocations can add up to micro-stutters during month timeline scroll.
- **2) List prop/callback churn**: inline objects/functions (`renderItem`, `{}` fallbacks, viewability config) can create extra work while the list is actively scrolling.
- **3) Year pager mini months**: inline layout objects per mini month can amplify work during paging/updates.
- **4) Lack of “where did the hitch happen?” signal**: without a hitch detector and phase tags, it’s hard to attribute stutters to a code phase.

#### Fixes added (engineering summary)
- Added a **dev-only JS hitch detector** (requestAnimationFrame delta \(> 24ms\)) with a **CULPRIT PHASE** tag for correlation.
- Added targeted **dev-only perf markers** for calendar lifecycle and hot interactions (load, month window build, day tap → modal open, modal save).
- Reduced MonthGrid/DayCell hot-path work by precomputing ISO keys per month, reusing stable per-day press handlers, and sharing style objects across cells.
- Stabilized Calendar list props/callbacks (no per-render `{}` fallbacks for empty months; stable key extractors, viewability config, and scroll handlers).
- Reduced year pager prop churn by stabilizing mini-month layout styles and avoiding per-item empty-map allocations.

#### Files touched (high signal)
- `src/perf/probe.ts`
- `src/features/calendar/screens/CalendarScreen.tsx`
- `src/features/calendar/screens/CalendarView.tsx`
- `src/components/calendar/MonthGrid.tsx`
- `docs/perf-calendar.md`

#### Failures prevented
- ✅ Fewer avoidable JS allocations during scroll (reduces risk of micro-stutter)
- ✅ Better attribution of dev-only hitches to a rough code phase (CULPRIT PHASE tagging)

#### What remains intentionally out of scope
- Medium-risk list/animation architecture changes (kept Phase 1 strictly low-risk and reversible).

#### Constraints confirmation
- ✅ No UI/UX changes
- ✅ No feature changes
- ✅ No storage schema/key/semantic changes
- ✅ Expo Go compatible

#### Quick validation checklist
- Calendar month timeline: scroll up/down quickly; verify no visible behavior changes.
- Year view: swipe years; tap a month to open; verify no visible behavior changes.
- Day tap: tap multiple days quickly; verify correct entry loads and modal opens.
- Save: edit mood/note; save; verify persistence and no crashes.
- Dev logs: confirm metadata-only output; no notes/entries/settings payloads.

## Version 0.7 — <short title> [future]

### Version 0.7 — <short title> (YYYY-MM-DD)

#### Why we did it (layman terms)
- [bullets]

#### Risks / problems discovered (ranked)
- **1)** …
- **2)** …

#### Fixes added (engineering summary)
- [bullets]

#### Files touched (high signal)
- [paths]

#### Failures prevented
- ✅ …

#### What remains intentionally out of scope
- …

#### Constraints confirmation
- ✅ No UI/UX changes
- ✅ No feature changes
- ✅ No storage schema/key/semantic changes
- ✅ Expo Go compatible

#### Quick validation checklist
- …

## Version 1.0 — <short title> [future]

### Version 1.0 — <short title> (YYYY-MM-DD)

#### Why we did it (layman terms)
- [bullets]

#### Risks / problems discovered (ranked)
- **1)** …
- **2)** …

#### Fixes added (engineering summary)
- [bullets]

#### Files touched (high signal)
- [paths]

#### Failures prevented
- ✅ …

#### What remains intentionally out of scope
- …

#### Constraints confirmation
- ✅ No UI/UX changes
- ✅ No feature changes
- ✅ No storage schema/key/semantic changes
- ✅ Expo Go compatible

#### Quick validation checklist
- …

---

### v0.6 Phase 7 — Calendar micro-hitch elimination (2026-02-11)

#### Why we did it (layman terms)
- The Calendar felt “almost smooth” but still had **micro-freezes** (200–900ms) that broke the Apple-like feel.
- Many hitches showed up as **`unknown`**, making it hard to decide what to fix vs what was dev tooling/GC noise.

#### Risks / problems discovered (ranked)
- **1) Unattributed JS hitches (`unknown`)**: without context, we could waste time optimizing the wrong thing (e.g. Metro stalls).
- **2) CalendarView paging spikes**: swiping years mounts many mini-month cells at once; spikes looked like `CalendarView.scroll` ~250ms.
- **3) Prewarm work leaking across navigation**: background compute continuing after blur can create “tap freezes” when bouncing between screens.
- **4) Empty-month compute overhead**: many months have no entries; repeatedly allocating/looping per-day arrays adds avoidable work.

#### Fixes added (engineering summary)
- **Hitch attribution hardening (dev-only)**:
  - Added a **breadcrumbs ring buffer** (last ~50 markers) and included a small tail in `perf.report`.
  - Hitch phases are now inferred as: **explicit phase tag → nearest breadcrumb (±50ms) → `DEV_METRO_OR_GC`**.
  - This makes “unknown hitches” effectively **impossible** in reports.
- **Render/list breadcrumbs (dev-only, sampled)**:
  - Added lightweight breadcrumbs for MonthGrid renders/commits and sampled DayCell renders.
  - Added breadcrumbs around list scroll begin/end and prewarm start/chunk/cancel paths.
- **Empty-month fast path (no UX change)**:
  - `getMonthRenderModel` now avoids per-day allocations/loops when a month has no entries by reusing shared immutable arrays.
- **Prewarm safety (no UX change)**:
  - Prewarm work is cancellable and focus-aware to avoid leaking compute across navigation.

#### Files touched (high signal)
- `src/perf/probe.ts`
- `src/components/calendar/MonthGrid.tsx`
- `src/components/calendar/monthModel.ts`
- `src/features/calendar/screens/CalendarScreen.tsx`
- `src/features/calendar/screens/CalendarView.tsx`
- `docs/summary.md`

#### Metrics (from dev perf.report)
- **Before**: `CalendarView.scroll` hitches often appeared as ~250ms and many stalls were `unknown`.
- **After**: `CalendarScreen.scroll` p95 reached ~40–75ms in follow-up runs; large stalls are more clearly classified (breadcrumb phase or `DEV_METRO_OR_GC`).
- Note: `DEV_METRO_OR_GC` indicates suspected dev tooling / JS runtime stalls, not directly actionable app code.

#### Constraints confirmation
- ✅ No UI/UX changes
- ✅ No feature changes
- ✅ No storage semantic/key changes
- ✅ Expo Go compatible

#### Quick validation checklist (2–5 minutes)
- CalendarScreen: hard scroll across many months → confirm no periodic freezes.
- CalendarView: swipe years → confirm paging is responsive.
- Bounce CalendarView ↔ CalendarScreen rapidly → confirm no tap freezes.
- Collect `perf.report` → confirm no `unknown` phase remains (should infer breadcrumb or `DEV_METRO_OR_GC`).

---

### v0.6 Phase 8 — Calendar smoothness + release hardening (2026-02-13)

#### Why we did it (layman terms)
- Make Calendar scrolling/paging feel closer to iOS Calendar by removing remaining avoidable JS work and reducing log noise.
- Harden correctness/reliability under edge cases (dev-only chaos injection; safer async UI cleanup).

#### Risks / problems discovered (ranked)
- **1) Paging hitches in CalendarView**: year swipes can mount many mini-month cells and stall JS.
- **2) Per-instance Date work**: repeated “today key” computation across many MonthGrid instances adds noise during paging/mount.
- **3) Async UI lifecycle races**: navigating away mid-save can trigger state updates after unmount (warnings/crashes in worst cases).
- **4) Noisy hitch logs**: per-hitch logs can drown out summaries; we want “session start + session summary” reporting.
- **5) Some stalls are dev tooling**: Metro/GC pauses should be clearly labeled (`DEV_METRO_OR_GC`) and gated to avoid spam.

#### Fixes added (engineering summary)
- **CalendarView paging perf**:
  - Introduced memoized `YearPage` and `MiniMonthCard` components so `yearBase` updates don’t force re-render storms across offscreen pages.
  - Passed `todayKey` into mini MonthGrids so each MonthGrid doesn’t create its own Date/padStart work.
- **CalendarScreen perf hygiene**:
  - Passed `todayKey` into full MonthGrids (same reason: avoid per-instance Date work).
- **Reliability hardening (no UX change)**:
  - Added an `isMountedRef` guard in CalendarScreen save flow to avoid setState-after-unmount.
  - Added a DEV-only chaos injector for AsyncStorage operations to simulate failures/timeouts safely.
- **Logging cleanliness (dev-only)**:
  - Added `perf.sessionStart` markers for Calendar screen sessions.
  - Rate-limited per-hitch `perf.hitch` logs and only emits large/repeated `DEV_METRO_OR_GC` stalls (keep `perf.report` as primary).
  - Updated `docs/logger.md` with a clear legend for breadcrumbs, `perf.report` fields, and attribution rules.

#### Files touched (high signal)
- `src/features/calendar/screens/CalendarView.tsx`
- `src/features/calendar/screens/CalendarScreen.tsx`
- `src/components/calendar/MonthGrid.tsx`
- `src/lib/calendar/monthMatrix.ts`
- `src/data/storage/storageFaultInjection.ts`
- `src/data/storage/moodStorage.ts`
- `src/data/storage/settingsStorage.ts`
- `src/data/storage/demoSeed.ts`
- `src/perf/probe.ts`
- `docs/logger.md`
- `docs/summary.md`

#### Constraints confirmation
- ✅ No layout/spacing/typography/color changes
- ✅ No navigation route changes
- ✅ No feature changes
- ✅ No storage semantic/key changes
- ✅ Expo Go compatible

#### Quick validation checklist (2–5 minutes)
- CalendarView: swipe years quickly → confirm smoother paging (fewer freezes).
- CalendarScreen: hard scroll across many months → confirm smooth and responsive.
- Future date: attempt to tap/select a future day → confirm blocked (alert + no edit sheet).
- Today/past: tap day → edit → save → confirm unchanged behavior.
### How to use this file
- Append a new version section for each milestone (0.6, 0.7, 1.0).
- Do not edit or delete older entries.
- Focus on fundamentals, not features.

---

### v0.6 Phase 9 — Edge case hardening (midnight/DST/chaos/tests) (2026-02-13)

#### Why we did it (layman terms)
- Fix subtle correctness/reliability issues that only show up under stress (midnight rollover, DST, rapid taps, backgrounding mid-save, storage faults).
- Add deterministic test coverage + a dev harness to reproduce tricky scenarios without changing UI/UX.

#### Fixes added (engineering summary)
- **Midnight staleness**:
  - Added a day-boundary observer hook that updates `todayKey` at local midnight and on foreground resume (no polling).
  - Calendar screens now consume this `todayKey` so “today” highlights don’t go stale when the app stays open across midnight.
- **DST-safe date keying**:
  - Canonicalized local-day keys via `toLocalDayKey(date)` (YYYY-MM-DD from local calendar components).
  - Added `msUntilNextLocalMidnight(now)` with tests to support a single midnight timer (DST-safe).
- **Tap reliability + navigation gating**:
  - Added a tiny “last tap wins” frame coalescer used to gate rapid month taps (prevents transition stacking / freezes).
  - Formalized “latest-only” async guard helpers to prevent stale async reads from overriding newer taps.
- **Save/background safety**:
  - Added defensive AppState resume handling so the “saving” indicator remains consistent if the app backgrounds mid-save.
  - Added request-id + mounted/focus guards around async loads to prevent setState after unmount/blur.
- **Deterministic storage chaos + single injection point**:
  - Centralized AsyncStorage I/O through a wrapper (`storage.*`) so chaos/fault injection has exactly one integration point.
  - Chaos injection is deterministic by seed and supports per-op and per-key fail plans; logs are rate-limited.
- **Tests + dev harness**:
  - Introduced Jest tests for date keying, midnight scheduling, chaos determinism, corrupt JSON quarantine/reset, persist-first behavior, remove failure safety, and write serialization.
  - Added a dev-only “Debug Scenarios” runner callable from Metro console (no UI changes).

#### Files touched (high signal)
- `src/hooks/useTodayKey.ts`
- `src/lib/utils/date.ts`
- `src/features/calendar/screens/CalendarScreen.tsx`
- `src/features/calendar/screens/CalendarView.tsx`
- `src/data/storage/asyncStorage.ts`
- `src/data/storage/storageFaultInjection.ts`
- `src/data/storage/moodStorage.ts`
- `src/data/storage/settingsStorage.ts`
- `src/data/storage/demoSeed.ts`
- `src/dev/debugScenarios.ts`
- `docs/logger.md`
- `docs/summary.md`

#### Constraints confirmation
- ✅ No UI/UX layout/styling changes
- ✅ No navigation route changes
- ✅ No storage semantic/key changes
- ✅ No heavy work added to scroll/paging hot paths
- ✅ Expo Go compatible

---

### v0.6 Phase 10 — Docs refresh + onboarding (2026-02-14)

#### Why we did it (layman terms)
- Make it possible for a new engineer to onboard in ~10 minutes without tribal knowledge.
- Ensure all documentation matches the current code reality (calendar performance strategy, storage hardening, logging contract, lint guardrails).

#### Current state snapshot (high-signal)
- **Calendar smoothness**:
  - The big periodic “every ~7 months” freeze is addressed by using a **large mostly-static month window** in `CalendarScreen` (about 100 years; `WINDOW_CAP = 1201`, `start=-600`, `end=600`).
  - Window extension only happens near extreme edges and is deferred via `InteractionManager`.
  - Year paging avoids rerender storms via memoized page/card components and stable props; month taps are coalesced (last tap wins).
- **Observability**:
  - Dev-only JS hitch detector + `perf.report` summary on screen blur.
  - Hitch attribution is always classified (explicit tag → breadcrumb → `DEV_METRO_OR_GC`).
- **Storage reliability**:
  - Storage is untrusted: safe parse + validate + quarantine/reset on corruption.
  - Persist-first and serialized writes prevent “looks saved but isn’t” and lost updates.
  - Deterministic chaos injection exists for dev/tests to reproduce failures.
- **Scope note**:
  - There is currently **no future-date restriction** feature (it was explored and then rolled back to preserve “no UX change” constraints).

#### Docs updated (what changed)
- Consolidated “source of truth” docs for:
  - **Architecture boundaries + import rules** (ESLint-enforced)
  - **Logger/perf probe legend** + how to interpret `perf.report`
  - **Security/privacy checklist** (App Store-friendly language)
  - **README** with exact run/quality commands and pointers

#### Files touched (docs only)
- `README.md`
- `docs/architecture.md` (canonical; all guides live under `docs/`)
- `docs/DECISIONS.md`
- `docs/logger.md`
- `docs/SECURITY_CHECKLIST.md`
- `docs/summary.md`

#### Guarantees
- ✅ No app code/UX changes from this docs pass
- ✅ Docs now match the implemented architecture + invariants

---

<a id="2026-05-11--day-extensions--reminders"></a>
## 2026-05-11 — Day extensions & Reminders

### Summary

#### Why we did it (layman terms)
- Optional **Habits**, **Goals**, and **Reminders** under the **Today** mood card (and parallel hosts on **Journal** / **Calendar**) without bloating the primary mood ritual.
- **Reminders** behave more like a lightweight reminder list: **one calendar day at a time**, optional **time-of-day** shown in-app; **no push notifications** until explicitly built.

#### Fixes added (engineering summary)
- **`src/extensions/`**: day scope + registry + memo slots; host **`onBeforeDetailNavigate`** for stack navigation from modals.
- **`moodly.dayTodos`**: **`DayTodoItem.reminderMinutes`** (validated `0..1439` or `null`); **`setDayTodoReminder`** and related mutations on **`src/storage`**.
- **UI**: **`TodoScreen`** (**`Todo`** route, **Reminders** chrome), **`TodayTodoExtension`**, **`TodoTaskRow`**, **`TodoReminderPicker`**; draggable open list; strip matches **Goals**-style indigo alarm well.
- **Pure helpers**: **`src/lib/todos/`** re-exported via **`src/utils`** for ESLint-safe imports.

#### Files touched (high signal)
- `src/extensions/*`, `src/components/todayExtensions/*`, `src/components/todo/*`, `src/features/reminders/screens/TodoScreen.tsx`, `src/data/storage/dayTodosStorage.ts`, `src/hooks/useDayTodos.ts`, `docs/AGENTS.md`, `src/data/DATA_CONTRACT.md`

#### What remains out of scope
- **`expo-notifications`** (or similar) for firing at **`reminderMinutes`**.

#### Quick validation
- `npm run lint && npm run typecheck && npm test`

---

<a id="2026-05-11--production-hardening--release-plumbing"></a>
## 2026-05-11 — Production hardening & release plumbing

### Summary (2026-05-11)

#### Why we did it (layman terms)
- Reduce surprise at **real deploy** time: native identifiers, crash containment, calendar load consistency, and CI that catches broken Metro bundles early.

#### Fixes added (engineering summary)
- **`app.json`**: URL **`scheme`**, **`ios.bundleIdentifier`**, **`android.package`** (interim **`com.moodly.app`** — replace when final).
- **`AppErrorBoundary`**: fallback UI + **Try again** inside **`AppThemeProvider`**; **`app.boundary.render`** (error name only).
- **`eas.json`**: starter EAS profiles (**development** / **preview** / **production**).
- **Calendar**: **`fetchMoodCalendarSnapshot`**, **`dateKeys`**, shared **`afterNextFrame`**.
- **Dates**: stricter **`parseISODate`**, safe display formatters for bad keys (**`src/lib/utils/date.ts`**).
- **npm / CI**: **`doctor`**, **`export:ios-check`**, **`export:bundles-check`**; workflow runs **`expo-doctor`** + bundle export; **20 min** timeout.
- **Tests**: **`calendarSnapshot.test.ts`**, **`entry.test.ts`**, continued calendar/date tests.
- **Docs**: **`docs/WEB_DEPLOYMENT_CHUNKS.md`** plus README / handbook / checklists synced.

#### Files touched (high signal)
- `app.json`, `eas.json`, `package.json`, `.github/workflows/ci.yml`, `.gitignore`
- `src/app/AppErrorBoundary.tsx`, `src/app/RootApp.tsx`, `src/app/index.ts`
- `src/data/storage/calendarSnapshot.ts` (+ test), `src/lib/utils/date.ts`, `dateKeys.ts`, `afterNextFrame.ts`
- `docs/*.md`, `README.md`, `docs/ENGINEERING_HANDOFF.md`, `docs/SECURITY_CHECKLIST.md`

#### What remains intentionally out of scope
- Final **marketing** icons/splash; **EAS project** link; **web** as primary surface; full **npm audit** cleanup for **jest-expo / Metro** transitives.

#### Quick validation checklist
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run doctor`, `npm run export:bundles-check`

---

<a id="2026-05-10"></a>
## 2026-05-10

### Documentation synchronization + implementation alignment (2026-05-10)

#### Why we did it (plain terms)

- Align **all onboarding and reference docs** with the **current** codebase: navigation (**floating tab bar + Settings modal**), **`AppThemeProvider`** appearance modes, **`FlashList`** on Journal + themed list surfaces, and the **reserved-but-empty** `domain`/`logic`/`insights` ESLint buckets vs actual code in **`src/utils`** / **`src/lib`**.
- Give future contributors a **single documentation index** (README) into design system, components, testing, performance, and structure.

#### Documentation changes (high signal)

- **README.md**: documentation table, stack versions, routing summary, state model pointers, changelog pointer to **`docs/summary.md`**.
- **`docs/architecture.md`**: expanded cross-links; **state management** subsection; **`fullGridLayout`** + **Journal list** hot-path notes; **`Reference docs`** table; clarified pure-layer wording vs ESLint placeholders.
- **New**: `docs/DESIGN_SYSTEM.md`, `docs/COMPONENTS.md`, `docs/TESTING.md`, `docs/PROJECT_STRUCTURE.md`, `docs/PERFORMANCE.md` (index + Journal **`freezeOnBlur`** / recycler background notes).
- **`docs/ENGINEERING_HANDOFF.md`**: navigation, theme, Journal **FlashList** / tab freeze caveat.
- **`docs/PERF_LIBRARIES.md`, `docs/perf-calendar.md`**: FlashList baseline + **`freezeOnBlur`** nuance + list **`style`** backgrounds.
- **`docs/APP_STORE_READINESS.md`, `docs/CHANGE_CHECKLIST.md`**, **`docs/DECISIONS.md`** (appearance decision **#12**; good-vs-bad extensions fixed), **`src/screens/README.md`, `src/storage/README.md`, `src/security/README.md`**.

#### Implementation truth captured (verification)

| Topic | Verified source |
|--------|----------------|
| Appearance modes | `src/types/settings.types.ts`, `AppThemeContext`, `SettingsScreen` |
| `userInterfaceStyle: automatic` in **app.json** vs in-app Appearance lock | `app.json`, `docs/DECISIONS.md` §12, `docs/DESIGN_SYSTEM.md` |
| Journal **`JOURNAL_LIST_IMPL`** FlashList default | `src/features/journal/screens/JournalScreen.tsx` |
| Journal **`freezeOnBlur: false`** | `src/navigation/RootNavigator.tsx` |
| ESLint **`domain`/`insights`** patterns | `eslint.config.cjs` (directories may be absent) |

#### Quick validation checklist (docs-only pass)

- [ ] From a clean checkout: **`npm install`**, **`npm run start`** (per README).
- [ ] **`npm run lint`**, **`npx tsc --noEmit`**, **`npm test`** succeed.
- [ ] README “Documentation index” links open without stale paths.

#### Follow-ups (tooling + native chrome)

- **`eslint.config.cjs`**: **`no-restricted-imports`** UI messages now consistently direct engineers to **`src/storage`** (not `src/data`); domain AsyncStorage hint aligned; **`src/lib`** hint references **`utils`** + facades instead of non-existent **`domain`** in typical paths.
- **`app.json`**: **`userInterfaceStyle`** set from **`light`** → **`automatic`** so Expo/native surfaces can track system appearance while **`AppThemeProvider`** still resolves locked Light/Dark in-app.
- **Theme-aware splash**: **`expo-splash-screen`** plugin + **`splash` / `ios.splash` / `android.splash`** **`dark`** backgrounds (`#F2F2F7` light, `#000000` dark); placeholder **`assets/images/splash-icon.png`** (replace with branded art); **`android.adaptiveIcon.backgroundColor`** → `#F2F2F7`.

---

### Mood grade color style Solid ↔ Gradient (settings + blooms)

#### Summary

- **Settings → Appearance**: second segmented control **Solid | Gradient**, persisted as **`AppSettings.moodGradeColorStyle`** (`settingsStorage`; default **`solid`**). **`AppThemeProvider`** exposes **`moodGradeColorStyle`** + **`setMoodGradeColorStyle`** for instant UI reaction.
- **Rendering**: **`moodGradeBloom.ts`** implements the design **135°** stops: **`mood` → `moodGradientMid` → `moodBloomAccent` (#FFB7E5)** at **0 / 0.7 / 1** (**TL→BR**). **`MoodGradeSurface`**, calendar **`MonthGrid`**, **`MoodPicker`**, **`MoodBadge`**, **`JournalScreen`**, **`CalendarView`** stay wired through **`extraData`** / props. **Solid** avoids gradient cost as the default fallback.

#### Touch list

| File / area | Notes |
|-------------|-------|
| `src/types/settings.types.ts`, `settingsStorage*` | Persisted **moodGradeColorStyle** validation + corrupt handling |
| `src/theme/AppThemeContext.tsx`, `moodGradeBloom.ts`, `MoodGradeSurface.tsx` | Gradient math + reusable surface primitive |
| `src/theme/colors.ts` | **`mood`**, **`moodGradientMid`**, **`moodBloomAccent`**, **`moodBackground`** (Bloom spec) |
| `monthModel.ts`, `MonthGrid.tsx` | **`moodGradeByDay`** + gradient dots/fills |
| `CalendarScreen.tsx`, `CalendarView.tsx`, `JournalScreen.tsx` | Props + **`extraData`** wiring where lists recycle rows |
| `SettingsScreen.tsx` | Second LiquidGlass segment row under Appearance |
| `src/data/DATA_CONTRACT.md`, **`docs/DESIGN_SYSTEM.md`**, **`README.md`**, **`docs/CHANGELOG.md`** | Contract + design + product notes |

