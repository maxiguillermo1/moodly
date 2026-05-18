# Performance notes (index)

**Product context:** Moodly **v0.6** treats scroll and navigation fluidity as part of calm, native feel — see [`AGENTS.md`](./AGENTS.md) § Interaction quality & iOS fluidity and [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) § Moodly UX constitution.

## Fluidity pass (reconciliation + main tabs)

- **`FloatingTabBar`**: each tab is a **`React.memo`** child (`TabItem`) so **focus changes and unrelated parent re-renders** do not rebuild every tab’s press handler and icon subtree at once (snappier tab switches).
- **`TodayExtensionsPanel`** + **`DayExtensionsStack`**: **memoized** so **mood / note state updates** on Today do not force extension registry + slot remounts when the **calendar day** is unchanged (extensions load independently of the sheet typing path).

| Topic | Doc |
|--------|-----|
| **Engineering changelog (what we optimized & why)** | [`docs/PERFORMANCE_NOTES.md`](./PERFORMANCE_NOTES.md) |
| Calendar month/year hot paths, MonthGrid rules, probes | [`docs/perf-calendar.md`](./perf-calendar.md) |
| FlashList adoption, Expo compatibility | [`docs/PERF_LIBRARIES.md`](./PERF_LIBRARIES.md) |
| Hitch detector, breadcrumbs, interpreting `perf.report` | [`docs/logger.md`](./logger.md), `src/perf/probe.ts` |
| Perf validation / baselines | `docs/PERF_VALIDATION.md`, `docs/PERF_BASELINE.md`, `docs/PERF_RESULTS.md` |
| CI: Metro bundle export (iOS + Android) | `npm run export:bundles-check` (see `.github/workflows/ci.yml` on `main`) |

## Product-facing list behavior (Journal)

- **Default**: **`FlashList`** in `JournalScreen` (constant `JOURNAL_LIST_IMPL`).  
- **Fallback**: Toggle the same constant to `'flatlist'` for A/B or debugging.
- **Tab lifecycle**: **`Journal`** tab sets `freezeOnBlur: false`** in tab options so thawing FlashList does not hitch; other tabs may still use `freezeOnBlur: true` (`RootNavigator.tsx`).
- **Avoid white flashes**: list components set an explicit **`style` / surface color** aligned with `system.background` (and calendar timeline with `secondaryBackground`) so recycler views never default to stark white behind themed chrome.
