# Performance notes (index)

Performance work is intentionally split by topic:

| Topic | Doc |
|--------|-----|
| Calendar month/year hot paths, MonthGrid rules, probes | [`docs/perf-calendar.md`](./perf-calendar.md) |
| FlashList adoption, Expo compatibility | [`docs/PERF_LIBRARIES.md`](./PERF_LIBRARIES.md) |
| Hitch detector, breadcrumbs, interpreting `perf.report` | [`docs/logger.md`](./logger.md), `src/perf/probe.ts` |
| Perf validation / baselines | `docs/PERF_VALIDATION.md`, `docs/PERF_BASELINE.md`, `docs/PERF_RESULTS.md` |

## Product-facing list behavior (Journal)

- **Default**: **`FlashList`** in `JournalScreen` (constant `JOURNAL_LIST_IMPL`).  
- **Fallback**: Toggle the same constant to `'flatlist'` for A/B or debugging.
- **Tab lifecycle**: **`Journal`** tab sets `freezeOnBlur: false`** in tab options so thawing FlashList does not hitch; other tabs may still use `freezeOnBlur: true` (`RootNavigator.tsx`).
- **Avoid white flashes**: list components set an explicit **`style` / surface color** aligned with `system.background` (and calendar timeline with `secondaryBackground`) so recycler views never default to stark white behind themed chrome.
