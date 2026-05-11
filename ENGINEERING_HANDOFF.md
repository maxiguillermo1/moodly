## Moodly engineering handoff (read this first)

**Moodly V2 (2.0.0)** — See **`docs/CHANGELOG.md`** for UI consolidation (**`MoodEntryFields`**), tab bar polish, **`src/constants/`** release metadata, and **`npm run typecheck`**. Settings **Appearance** (Auto/Light/Dark + Solid/Gradient) unchanged.

Goal: a new engineer can ship safely in ~10 minutes.

### What Moodly is

- Local-first mood + note tracker (**Calendar year + month timeline**, **Today**, **Journal**).
- No backend. No network. All data is **AsyncStorage**.
- Privacy is non-negotiable: **never log notes** (metadata-only structured logs).

### One mental model (layers)

| Layer | Location |
|--------|-----------|
| UI | `src/screens/`, `src/components/`, `src/hooks/` |
| Cross-cutting constants | **`src/constants/`** (e.g. `APP_RELEASE_VERSION` — keep in sync with `app.json`) |
| Pure helpers | **`src/utils/`**, **`src/lib/**`** (no React / nav / persistence in pure rules) |
| Persistence API (screens import this) | **`src/storage/`** |
| Persistence implementation | `src/data/storage/` |
| Logging / console safety | **`src/security/`** (implementation under `src/lib/security/`) |
| Theme + appearance runtime | **`src/theme/AppThemeContext.tsx`** (`useAppTheme()`) |
| Dev perf probes | **`src/perf/`** |

See **`docs/architecture.md`** for enforced import boundaries and ESLint rationale.

Reserved-but-empty ESLint buckets **`src/domain/`**, **`src/logic/`**, **`src/insights/`** may appear in tooling; **`src/utils`** is where most pure helpers live today (**`docs/PROJECT_STRUCTURE.md`**).

### Navigation & chrome (shipping UI)

- **Tabs** + **`FloatingTabBar`**: Calendar (stack), Today, Journal — `src/navigation/RootNavigator.tsx`.
- **`FloatingTabBar`**: **`LiquidGlass`** capsule, **`useSafeAreaInsets()`** for bottom inset, narrower than legacy tab bars.
- **Settings**: modal stack screen (**not** a tab); Appearance = **segmented capsule** (**Auto / Light / Dark**) + Theme row (calendar dot vs fill). Gear from `ScreenHeader` / Calendar toolbar.
- **Journal**: **`FlashList`** by default (`JOURNAL_LIST_IMPL` in `JournalScreen`); **`freezeOnBlur: false`** on that tab only to reduce thaw hitches — see **`docs/PERFORMANCE.md`**.

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
- **UI flow** → `src/screens/*` (avoid heavy work in scroll callbacks).
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
npm run lint
npx tsc --noEmit
npm test
```

Details: **`docs/TESTING.md`**.
