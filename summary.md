# Moodly – Engineering Summary Log

## Version 0.5 — Core Foundation (2026-02-03)

### Executive summary (non-technical)
Moodly v0.5 is a local-first app with no accounts, backend, sync, or networking. This milestone focuses on foundations: clear layer boundaries, predictable data handling, privacy-safe logging, and performance hygiene in calendar hot paths.

Scope is intentionally limited to internal quality upgrades. The app’s UI/UX and behavior remain the same, while the codebase is made harder to misuse and more resilient to real-world device/storage conditions.

### Top risks identified (ranked)
- **1) Architectural drift via deep imports**: If screens/components import `src/lib/**` or `src/data/**` directly, they can bypass invariants/caches and create inconsistent patterns across the codebase.
- **2) Date-key semantics footguns (UTC vs local day)**: Using UTC-derived keys (e.g. `toISOString().slice(...)`) can silently shift entries across days near midnight/DST, causing “missing” or “moved” entries.
- **3) Corrupted local storage**: AsyncStorage can contain partial/invalid JSON; without hard boundaries, corruption can crash-loop or silently poison state.
- **4) Sensitive data leakage via logs**: Mood notes are sensitive; accidental logging of entries/settings blobs is an easy privacy incident vector.
- **5) Calendar hot-path regressions at scale**: Calendar grids and lists can degrade from small allocations/unstable props as dataset size grows to years of daily entries.

### Concrete improvements applied

#### Architecture
- **Beginner-friendly facades**: Introduced/confirmed stable import surfaces so the “right” imports are obvious:
  - `src/storage` for persistence APIs
  - `src/security` for safe logging/redaction/console patching
  - `src/domain` for pure rules + derived selectors (and shared date/mood helpers exposed intentionally)
- **App bootstrap clarity**: Centralized startup wiring in `src/app/RootApp.tsx` and exported from `src/app`.

#### Data (integrity + correctness)
- **Storage treated as untrusted**: Safe parsing + runtime validation at boundaries for entries and settings under `src/data/storage/*`.
- **Corruption quarantine**: On parse failures, raw values are quarantined and storage is reset to a safe default so the app stays usable.
- **Dev-only fail-fast**: In development, invalid date keys / moods / ranges throw early at the storage boundary to catch misuse before it ships.
- **Cache posture**: Added derived caches for common read patterns (sorted entries, entries-by-month) with explicit invalidation on writes.

#### Security (privacy by construction)
- **Privacy-safe logger**: Centralized logger with redaction; production defaults avoid verbose logs.
- **Console hardening**: `console.*` patched to reduce accidental leakage and align logging with redaction rules.
- **Guardrails against sensitive args**: Dev-only checks prevent logging payload-like blobs that resemble entries/settings/notes.

#### Performance (runtime posture)
- **Hot-path allocation hygiene**: Reduced per-render/per-cell allocations and stabilized styles/props in calendar components.
- **Navigation responsiveness**: Non-urgent work (e.g. demo seeding) is deferred so first paint is not blocked.

#### Docs (ownership + intent)
- **Folder READMEs**: Added short READMEs to `src/screens`, `src/storage`, `src/domain`, `src/security` to explain responsibilities and import expectations.
- **Architecture decision docs**: Added/updated docs describing layer rules, import direction, and key invariants (dates, storage, logging).

### Before / after risk reduction
- **Deep imports from internals**: was possible in UI → now prevented by ESLint (screens/components/hooks must use facades).
- **UTC date-key derivation**: was easy to introduce → now prevented by ESLint (ban on `toISOString().slice(...)` for date keys).
- **Corrupt storage crash/poisoning**: was possible → now guarded by safe parsing + quarantine + defaults.
- **Sensitive payload logging**: was easy to accidentally do → now guarded by redaction, console patching, and dev-only assertions.
- **Calendar perf regressions**: was easy to re-introduce with inline objects/unstable props → now reduced via memoization and stable style/prop patterns in hot components.

### What is intentionally out of scope
- **Accounts/auth**: not built to keep local-first posture and avoid premature identity/security surface area.
- **Backend/sync/networking**: deferred; current foundation keeps data and boundaries structured for future additions without rewriting v0.5.
- **Encryption-at-rest**: deferred; would require explicit key management, threat model decisions, and performance tradeoffs.
- **Analytics UI / tracking**: not built; derived selectors exist for future use, but no instrumentation or UI exposure is added.

### Constraints confirmation
- **No UI/UX changes**: layout, visuals, spacing, typography, navigation routes, and interactions were not changed as part of this foundation pass.
- **No feature changes**: no new screens/flows were added; work is limited to internal structure, guardrails, and safety/performance posture.
- **No data semantic changes**: storage keys and meaning remain the same; changes are validation, resilience, caching, and safer access patterns.

### Quick validation checklist (1–2 minutes)
- Launch app → confirm no crashes and screens render immediately.
- Today: create/update entry → relaunch → confirm persisted.
- Journal: scroll → edit → delete → confirm list updates.
- Calendar: open year view → open a month → scroll months → tap a day → save → back.
- Settings: open → toggle available settings → relaunch → confirm persistence.

### Founder / portfolio framing
This version demonstrates disciplined ownership of fundamentals: it enforces architecture boundaries, treats local data as production data, and defaults to privacy-safe behavior. The result is a repo that is easier to extend correctly under time pressure, while keeping product scope intentionally narrow.

The next milestones (0.6, 0.7) should follow the same posture: append-only decisions, guardrails over conventions, and only the minimum complexity required for the next constraint the product truly faces.

---
### 2026-02-04

#### Version 0.5 — Logging & Observability (Privacy‑Safe, Structured)

##### Why we did it (layman terms)
- Make performance wins **provable** (cold vs warm loads) without guesswork.
- Keep logging **privacy-safe by default** (no user content; metadata only).
- Reduce “debug noise” by standardizing format, adding log budgets, and preferring summaries.
- Ensure production behavior stays **quiet and safe** (dev-only logs off; warnings rate-limited).

##### What changed (engineering summary)
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
`[PERF][calendar] calendar.loadEntries { phase: 'warm', source: 'sessionCache', durationMs: 1.6 }`

##### Files touched
- **storage/**
  - `src/data/storage/moodStorage.ts`
  - `src/data/storage/settingsStorage.ts`
  - `src/data/storage/sessionStore.ts`
  - `src/data/storage/demoSeed.ts`
- **screens/**
  - `src/screens/CalendarScreen.tsx`
  - `src/screens/CalendarView.tsx`
  - `src/screens/JournalScreen.tsx`
  - `src/screens/SettingsScreen.tsx`
- **security/logging/**
  - `src/lib/security/logger.ts`
  - `src/lib/logging/patchConsole.ts`
  - `src/lib/utils/devPerf.ts`
- **docs/**
  - `docs/logger.md`

##### Risk & Guarantees
✅ No UI/UX changes  
✅ No feature changes  
✅ No storage semantic/key changes  
✅ Expo Go compatible  

##### How to verify (2-minute checklist)
- Today: save/update entry → relaunch → confirm persisted.
- Journal: list loads quickly → scroll → edit → save → confirm updates.
- Calendar: year swipe smooth → open month → scroll months → tap day → save → back.
- Settings: stats populate correctly and toggles still persist.
- Dev logs: confirm only metadata objects appear (no notes/entries/settings blobs).

##### Notes for v0.6+ (optional)
- Add **explicit “revalidate”** phase where/if we introduce background refresh.
- Centralize event naming conventions further (one place to list canonical events).
- Add a small **in-app dev-only export** of recent structured logs (still local-only, no network) if needed for audits.

---
### 2026-02-11

#### Version 0.6 — Real-World Hardening (Survive Real Users)

##### Why we did it (layman terms)
- Prevent “rare” edge cases (double taps, app backgrounding mid-save, slow storage) from turning into **data loss** or **crash loops**.
- Make the app resilient on old devices and under real-world chaos, without changing the product.

##### Problems discovered (what would break)
- **Concurrent writes could silently lose data**: two overlapping entry writes could race and overwrite each other (last writer wins).
- **Failed writes could desync in-memory UI/cache from disk**: some flows updated RAM state before persistence completed.
- **Unhandled async errors from UI handlers**: async `onPress` paths could throw/reject without user-safe recovery.
- **Calendar fast-tap race**: rapid date taps could show the wrong entry in the edit sheet due to out-of-order async reads.
- **Settings toggle spam**: rapid switching could race writes and end in stale/incorrect persisted values.

##### Protections added (engineering summary)
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

##### Files touched (high signal)
- **storage (reliability)**
  - `src/data/storage/moodStorage.ts` (entries write queue + persist-first cache commits)
  - `src/data/storage/settingsStorage.ts` (settings write queue + persist-first cache commits)
- **screens (safe error handling / race guards)**
  - `src/screens/CalendarScreen.tsx` (save spam guard, never-throw save, stale read guard)
  - `src/screens/JournalScreen.tsx` (catch delete/save failures)
  - `src/screens/SettingsScreen.tsx` (catch toggle + clear failures, resync on error)

##### Phase 1 code links (exact functions changed)
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
  - `src/screens/CalendarScreen.tsx`: modal save `onPress` (no throw), `handlePressDate` (stale-read guard), save spam guard (`isSavingRef`)
  - `src/screens/JournalScreen.tsx`: `handleSaveEdit`, delete confirm `onPress` (try/catch + user-safe alerts)
  - `src/screens/SettingsScreen.tsx`: toggle `onValueChange` handlers + `handleClearData` (try/catch + resync)

##### Failures now prevented
- ✅ Silent data loss from overlapping writes (double-tap / multi-screen write races)
- ✅ Crash loops / unhandled promise rejections from async UI event handlers
- ✅ Calendar edit sheet showing the wrong day’s data after rapid taps
- ✅ Settings persisting stale values after toggle spam (writes are now serialized)
- ✅ “Saved in UI but not on disk” cache divergence on failed writes

##### What remains intentionally unsolved (v0.7+ candidates)
- **Encryption at rest** (requires explicit threat model + key management)
- **System dark mode** (currently forced light mode via Expo config; enabling is a visible change)
- **Midnight/timezone policy** (define/implement “today rolls over while open” behavior explicitly)
- **Disk-full simulation + recovery UX** (we recover safely; richer UX is optional)
- **Future sync engine** (no networking in this milestone; only safe foundations)

##### Migration note (v0.5 → v0.6)
v0.6 adds a reliability layer that makes storage writes **deterministic and race-safe** under real user behavior. The app remains local-first and feature-identical, but is significantly less likely to corrupt data or crash under chaos.

##### Constraints confirmation
- **No feature changes** (no new screens/flows/routes; behavior on success paths unchanged)
- **No storage semantic/key changes** (`moodly.entries` / `moodly.settings` unchanged; only write safety added)
- **Expo Go compatible**

##### Quick validation checklist (2–5 minutes)
- Today: save/update entry → relaunch → confirm persisted.
- Journal: scroll → edit → save → long-press delete → confirm updates.
- Calendar: year → month → tap day → save → confirm updates (try fast taps).
- Settings: toggle both switches repeatedly → relaunch → confirm persisted.
- Simulate failure (optional): toggle airplane mode doesn’t matter; instead watch for no crashes on rapid interactions.

## Version 0.7 — <short title>
[future]

---
### How to use this file
- Append a new version section for each milestone (0.6, 0.7, 1.0).
- Do not edit or delete older entries.
- Focus on fundamentals, not features.

