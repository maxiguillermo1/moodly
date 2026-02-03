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

## Version 0.6 — <short title>
[future]

## Version 0.7 — <short title>
[future]

---
### How to use this file
- Append a new version section for each milestone (0.6, 0.7, 1.0).
- Do not edit or delete older entries.
- Focus on fundamentals, not features.

