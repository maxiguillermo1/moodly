## Moodly engineering handoff (read this first)

**Full product vision, UX rules, and agent constitution:** [`AGENTS.md`](./AGENTS.md) — read that for *what Moodly is*, Today vs extensions hierarchy, Goals/Reminders philosophy, and non-negotiables.

**Moodly v0.5 (0.5.0)** — See **`docs/CHANGELOG.md`** for the maturity model, UI consolidation (**`MoodEntryFields`**), tab bar polish, **`src/constants/`** release metadata, **`npm run typecheck`**, **`export:bundles-check`** in CI, calendar **`fetchMoodCalendarSnapshot`**, **`AppErrorBoundary`**, and **`eas.json`**. Settings **Appearance** (Auto/Light/Dark + Solid/Gradient) unchanged.

Goal: a new engineer can ship safely in ~10 minutes.

### What Moodly is

- Local-first mood + note tracker (**Calendar year + month timeline**, **Today**, **Journal**).
- No backend. No network. All data is **AsyncStorage**.
- Privacy is non-negotiable: **never log notes** (metadata-only structured logs).

### One mental model (layers)

| Layer | Location |
|--------|-----------|
| UI | `src/features/*/screens/`, `src/screens/index.ts` (barrel), `src/components/`, `src/hooks/` |
| Cross-cutting constants | **`src/constants/`** (e.g. `APP_RELEASE_VERSION` — keep in sync with `app.json`) |
| Pure helpers | **`src/utils/`**, **`src/lib/**`** (no React / nav / persistence in pure rules) |
| Persistence API (screens import this) | **`src/storage/`** |
| Persistence implementation | `src/data/storage/` |
| Logging / console safety | **`src/security/`** (implementation under `src/lib/security/`) |
| Theme + appearance runtime | **`src/theme/AppThemeContext.tsx`** (`useAppTheme()`) |
| Dev perf probes | **`src/perf/`** |

See **`docs/architecture.md`** for enforced import boundaries and ESLint rationale.

Reserved-but-empty ESLint buckets **`src/domain/`**, **`src/logic/`**, **`src/insights/`** may appear in tooling; **`src/utils`** is where most pure helpers live today (**`docs/PROJECT_STRUCTURE.md`**). For **web-only** deployment sequencing (non-primary today), see **`docs/WEB_DEPLOYMENT_CHUNKS.md`**.

### Navigation & chrome (shipping UI)

- **Tabs** + **`FloatingTabBar`**: Calendar (stack), Today, Journal — `src/navigation/RootNavigator.tsx`.
- **`FloatingTabBar`**: **`LiquidGlass`** capsule, **`useSafeAreaInsets()`** for bottom inset, narrower than legacy tab bars.
- **Settings**: modal stack screen (**not** a tab); Appearance = **segmented capsule** (**Auto / Light / Dark**) + Theme row (calendar dot vs fill). Gear from `ScreenHeader` / Calendar toolbar.
- **Journal**: **`FlashList`** by default (`JOURNAL_LIST_IMPL` in `JournalScreen`); **`freezeOnBlur: false`** on that tab only to reduce thaw hitches — see **`docs/PERFORMANCE.md`**.
- **Other stack screens**: **Habits**, **Goals**, **Reminders** — **Reminders** is route **`Todo`** (`RootNavigator`) with optional **`date`** param; hot day data lives in **`moodly.tasks.day.<YYYY-MM-DD>`** shards while recurrence/metadata stays in **`moodly.tasks`**. See **`docs/AGENTS.md`** and **`src/data/DATA_CONTRACT.md`**.

### Data flow: “tap day → edit → save”

1) User taps a day in **MonthGrid**  
   → render model maps day → **`YYYY-MM-DD`** (`src/components/calendar/monthModel.ts`).

2) **CalendarScreen** updates selection and loads entry (`getEntry`) with latest-only/async guards.

3) Save calls **`upsertEntry`** from **`src/storage`**.

4) **`moodStorage`** validates, **writes AsyncStorage first**, then updates caches (serialized writes).

5) Calendar updates local month map for smooth scroll (no full reload).

### State management (today)

No global Redux/Zustand store: **React state**, **navigation state**, **`AppThemeContext`**, **`useFocusEffect` loads**, **`src/storage`** for durable settings and entries.

### How to add a feature safely

- **Pure helper** → `src/utils/` (or a new pure module under `src/lib/` that obeys ESLint purity rules).
- **Persistence change** → `src/data/storage/*` + **`src/data/DATA_CONTRACT.md`**
- **UI flow** → `src/features/*/screens/*` (avoid heavy work in scroll callbacks).
- **Reusable widget** → `src/components/*` (export via `components/ui`, `components/mood`, or `calendar` as appropriate).

**Always** load/save via **`src/storage`**, never AsyncStorage directly from screens.

### Calendar performance rules (do not regress)

Hot paths:

- **`CalendarScreen`** month timeline (**FlashList**)
- **`CalendarView`** year pager (**FlatList** paging)
- **`MonthGrid`** / DayCell memoization (`fullGridLayout` for measured widths)

Rules:

- No React state churn during momentum scroll — prefer refs where possible.
- Stable props/styles; reuse cached month models and matrices.

### Key invariants

- Local **`YYYY-MM-DD`** keys; **`toISOString().slice`** pattern banned (ESLint).
- Storage validated + corruption quarantined; never crash-loop.
- **Persist-first**, **serialized writes**.
- **`no-console`** in UI; use **`logger`** from **`src/security`** (metadata only).
- Goals daily logging is idempotent per day; paused goals do not receive progress writes.
- Reminders are in-app time cues only; no OS notifications or permission prompts exist today.

### How to debug jank (dev-only)

See **`docs/logger.md`** and **`docs/perf-calendar.md`**.

### Dev-only debug scenarios

In Metro console:

```js
globalThis.MoodlyDebug.list()
globalThis.MoodlyDebug.runAll()
globalThis.MoodlyDebug.run('rapidMonthTaps')
globalThis.MoodlyDebug.setChaos({ enabled: true, seed: 1, failNext: { getItem: 1 } })
```

### Quality gates

```bash
npm run typecheck
npm run lint
npm test
npm run validate:ios-release   # fastest App Store/iOS readiness gate
npm run validate:release       # broader all-platform gate
```

Details: **`docs/TESTING.md`**.
