## Moodly architecture (10‑minute onboarding)

**Quick links:** [AGENTS](./AGENTS.md) · [CONTRIBUTING](./CONTRIBUTING.md) · [Project tree](./PROJECT_STRUCTURE.md) · [Design system](./DESIGN_SYSTEM.md) · [Components](./COMPONENTS.md) · [Onboarding](./ENGINEERING_HANDOFF.md) · [Data contract](../src/data/DATA_CONTRACT.md) · [Testing](./TESTING.md) · [App Store](./APP_STORE_READINESS.md) · [Web roadmap](./WEB_DEPLOYMENT_CHUNKS.md) · [Performance](./PERFORMANCE.md)

This is the **canonical** architecture doc (everything in **`docs/`**; see [documentation index](./README.md)).

**Product + emotional UX constitution:** [`AGENTS.md`](./AGENTS.md) — what Moodly is and is not, **the emotional timeline as the primary artifact**, **product hierarchy** (mood map → reflection → continuity → context → insights), Today hierarchy, Goals/Reminders philosophy, fluidity standards, and agent non-negotiables. This file stays focused on **code structure, state ownership, and import boundaries**.

### Canonical source by concern

| Concern | Canonical doc |
|---------|---------------|
| App layers, import boundaries, state ownership | This file |
| Product identity, **emotional timeline hierarchy**, UX rules, agent constitution | [`AGENTS.md`](./AGENTS.md) |
| Feature map & relationships | [`FEATURES.md`](./FEATURES.md) |
| Zero-compromise engineering bar | [`ZERO_COMPROMISE.md`](./ZERO_COMPROMISE.md) |
| Mechanical folder map | [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md) |
| Current persistence schema / safety snapshot | [`ARCHITECTURE_STATE.md`](./ARCHITECTURE_STATE.md) |
| Storage contracts and future database migration | [`DATA_ARCHITECTURE.md`](./DATA_ARCHITECTURE.md), [`DATA_SAFETY.md`](./DATA_SAFETY.md), [`../src/data/DATA_CONTRACT.md`](../src/data/DATA_CONTRACT.md) |
| Composed cross-facet day read model (not persisted) | [`DAILY_ACTIVITY.md`](./DAILY_ACTIVITY.md) |
| Plain-English codebase map + naming rules | [`CODEBASE_MAP.md`](./CODEBASE_MAP.md) |
| Scale index (shards, caps, perf links) | [`SCALABILITY.md`](./SCALABILITY.md) |
| Performance gates and release thresholds | [`PERFORMANCE.md`](./PERFORMANCE.md), [`PERFORMANCE_BENCHMARKS.md`](./PERFORMANCE_BENCHMARKS.md) |
| Risk and long-term roadmap | [`RISK_REGISTER.md`](./RISK_REGISTER.md), [`ROADMAP.md`](./ROADMAP.md) |

### Layer model (plain English)

- **Feature screens (`src/features/*/screens/`)**: user intent + orchestration (“what happens when the user taps?”); **`src/screens/index.ts`** re-exports for stable `from '../screens'` imports.
- **Components (`src/components/`)**: reusable UI (“how it looks / renders”)
- **Hooks (`src/hooks/`)**: reusable UI wiring (React‑only helpers)
- **Pure rules** (`src/utils/` and shared **`src/lib/**`** helpers): deterministic utilities (no React, no navigation, no persistence imports). Optional empty **`src/domain/`**, **`src/logic/`**, **`src/insights/`** directories are wired in ESLint for future extraction; today most pure helpers ship under **`src/utils`** / **`src/lib`**.
- **Storage facade (`src/storage/`)**: the structured persistence API for product code — re-exports **`src/data/repositories`** (implementations in **`src/data/storage/`**)
- **Repositories (`src/data/repositories/`)**: domain-shaped facades (`entriesRepository`, `settingsRepository`, …) so backends can be swapped later
- **Storage implementation (`src/data/storage/`)**: AsyncStorage + caching + validation + quarantine + write locks
- **Security (`src/security/`)**: privacy‑safe logger + redaction + console patch
- **Perf probes (`src/perf/`)**: dev‑only observability (hitch detector, `perf.report`, list profiler summaries)
- **Theme/runtime appearance (`src/theme/`)**: `AppThemeProvider`, system palettes, tokens, persisted light/dark preference
- **Types (`src/types/`)**: shared TypeScript shapes (entries, mood grades, settings)

### State management (today)

There is **no global client store** (no Redux Toolkit / Zustand). State is composed of:

- **React component state / refs** per screen for UI and ephemeral flows (modals, scroll, selections).
- **React Navigation** for route state (tabs + stack modal for Settings).
- **Focus I/O:** screens that reload from **`src/storage`** on focus defer those reads until after transition work (**`InteractionManager.runAfterInteractions`**) where the pattern is already established, so tab/stack animations are not blocked by AsyncStorage.
- **`AppThemeContext`** for resolved appearance + design tokens (`useAppTheme()`).
- **Async persistence** via `src/storage`; session RAM caches updated **after** successful writes (`src/data/storage/*`).

### Repo map (“where do I put this?”)

- **Bootstrap**: `src/app/RootApp.tsx` (also: `AppErrorBoundary` child of `AppThemeProvider`)
- **Navigation**: `src/navigation/` (`RootNavigator.tsx`, `CalendarStack.tsx`, `FloatingTabBar.tsx`)
- **Calendar hot paths**:
  - `src/features/calendar/screens/CalendarScreen.tsx` (month timeline)
  - `src/features/calendar/screens/CalendarView.tsx` (year pager)
  - `src/components/calendar/MonthGrid.tsx` + `src/components/calendar/monthModel.ts`
  - Timeline FlashList row-height math: `src/lib/calendar/timeline/estimateTimelineMonthListItemHeight.ts` + `flashListLayout.ts` (lives under **`lib`** so the **`utils`** → **`lib/calendar`** export graph stays acyclic).
- **Day extensions (Today / Journal / Calendar)**:
  - `src/extensions/` — `DayScopeContext` (current `dateKey`), `dayExtensionRegistry`, memo **`dayExtensionSlots`** (`HabitsExtensionSlot`, `GoalsExtensionSlot`, `TodoExtensionSlot`).
  - `src/components/todayExtensions/` — `TodayExtensionsPanel`, **`TodayTodoExtension`**, **`TodayGoalsExtension`**, settings rows.
  - **Reminders** full screen: `src/features/reminders/screens/TodoScreen.tsx` (stack route **`Todo`**); hot storage: **`tasksStorage.ts`** day shards `moodly.tasks.day.<YYYY-MM-DD>` + **`moodly.tasks`** metadata; hook **`useDayTodos`**; façade **`dayTodosStorage.ts`**; UI **`TodoTaskRow`**, **`TodoReminderPicker`**.
- **Storage + contract**:
  - Public API: `src/storage/index.ts` (→ `src/data/repositories`)
  - Contract: `src/data/DATA_CONTRACT.md`
  - Entries: `src/data/storage/moodStorage.ts`
  - Settings: `src/data/storage/settingsStorage.ts`

### Import rules (enforced by ESLint)

These rules exist to prevent accidental performance/privacy regressions:

- **UI (screens/components/hooks/theme/app/navigation/extensions)**:
  - ✅ may import: `components`, `utils`, `theme`, `types`, `security`, `storage`, `perf` (dev‑only)
  - ❌ must not import: AsyncStorage, `src/data/storage/*`, deep `src/data/*`, or deep `src/lib/*`
- **Pure layers** (`utils` and, if present, `domain`/`logic`/`insights` folders named in ESLint):
  - ✅ may import: `types` (+ other pure helpers inside `src/utils`/`src/lib` as allowed by rules)
  - ❌ must not import: React, React Native, navigation, **`storage`** or **AsyncStorage**
- **Storage implementation (`src/data/`)**:
  - ✅ may import: `security` (logger), pure validation helpers
  - ❌ must not import: screens/components/navigation

See `eslint.config.cjs` for the exact restrictions.

### Naming & discoverability

- **Human map:** [`CODEBASE_MAP.md`](./CODEBASE_MAP.md) ties product features (Journal, Calendar, Goals, …) to **current** `src/` folders and lists **allowed** naming patterns (repositories, hooks, calculators).
- **Repositories** use plain domain words: e.g. `calendarSnapshotRepository` (composed calendar read), `dailyActivityRepository` (read model). Avoid vague `*Query*` or version suffixes unless a migration doc requires it.
- **Import aliases:** `@/`, `@features/`, `@repositories/`, `@shared/` — configured in `babel.config.js`, `tsconfig.json`, and Jest; details in [`CODEBASE_MAP.md`](./CODEBASE_MAP.md) §5.

### Wrong vs right imports (examples)

#### Example 1 — storage in UI

Bad:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllEntries } from '../data/storage/moodStorage';
```

Good:

```ts
import { getAllEntries } from '../storage';
```

#### Example 2 — logger in UI

Bad:

```ts
import { logger } from '../lib/security/logger';
```

Good:

```ts
import { logger } from '../security';
```

#### Example 3 — date keys

Bad:

```ts
const key = new Date().toISOString().slice(0, 10); // UTC (banned)
```

Good:

```ts
import { toLocalDayKey } from '../utils';
const key = toLocalDayKey(new Date());
```

### Hot paths (what to be careful with)

#### Calendar month timeline (`CalendarScreen`)

- Uses a **large mostly‑static month window** (about 100 years) to avoid periodic “window shift” freezes.
- **`fetchMoodCalendarSnapshot`** on focus (deferred via **`InteractionManager`**) loads **indexed entries + settings** in one parallel, coalesced read (`getCalendarEntriesByMonthIndexSnapshot` + settings).
- Month rows render via memoized **`CalendarTimelineMonth`**; **`selectedDateRef`** stabilizes **`renderMonthItem`** across day taps.
- Card-width **`onLayout`** is coalesced (rAF, scroll guard, flush on scroll end); FlashList **`overrideItemLayout`** uses per-month height math (`computeMonthTimelineRowHeights`).
- **`calendarListEpoch`** bumps only when local today changes (blur/midnight), not every focus.
- Deferred window extend / recenter work is **cancelled on blur** (`isFocusedRef` + task cancel).
- Avoid state updates during scroll; use refs + deferred work for non‑urgent operations. Details: [`perf-calendar.md`](./perf-calendar.md).

### State Infrastructure Trigger Points

Do not add a global store by default. Add state infrastructure only when at least one of these becomes true:

- Multiple unrelated screens need transactional updates over the same state.
- Local-first sync/import introduces background updates that cannot be represented cleanly with screen focus reloads.
- Extension policy or theme state needs selector-level subscriptions to avoid hot-path rerenders.
- Debugging state ownership becomes harder than the store migration itself.

If a store is introduced, keep persistence writes in repositories/storage and keep local-day/date rules in pure helpers.

#### Calendar year pager (`CalendarView`)

- Must avoid “re‑render storms” while paging years.
- Month taps are **coalesced** (last tap wins) to avoid stacking transitions during pager settle.

#### MonthGrid / DayCell (hottest UI code)

- Avoid per‑cell allocations (no inline objects/arrays/closures in tight loops).
- Keep props stable (memoized callbacks + stable style objects).
- Month computations should be cached per month (`monthModel` + `monthMatrix` cache).
- **`fullGridLayout.ts`**: derives consistent cell/dot metrics for full-width calendar cards — keep in sync when changing sizing.

#### Journal timeline (`JournalScreen`)

- Uses **FlashList** by default (toggle `JOURNAL_LIST_IMPL` vs FlatList rollback).
- **Tab option**: Journal sets **`freezeOnBlur: false`** to avoid thaw hitches while other tabs may freeze inactive routes.
- The list uses explicit **surface backgrounds** tuned to **`system.background`** to avoid recycler “white flashes” behind themed chrome.

### Reference docs

| Topic | Doc |
|--------|-----|
| New engineer onboarding | [`ENGINEERING_HANDOFF.md`](./ENGINEERING_HANDOFF.md), [`AGENTS.md`](./AGENTS.md) |
| Documentation index | [`README.md`](./README.md) |
| Feature map | [`FEATURES.md`](./FEATURES.md) |
| Folder tree | [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md) |
| Design tokens + appearance | [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) |
| Reusable UI + storage façade | [`COMPONENTS.md`](./COMPONENTS.md) |
| Testing | [`TESTING.md`](./TESTING.md) |
| Performance index | [`PERFORMANCE.md`](./PERFORMANCE.md) |
| Native release checklist | [`APP_STORE_READINESS.md`](./APP_STORE_READINESS.md) |
| Web roadmap (chunked) | [`WEB_DEPLOYMENT_CHUNKS.md`](./WEB_DEPLOYMENT_CHUNKS.md) |
| Owner decisions / invariants | [`DECISIONS.md`](./DECISIONS.md) |
| Logging + perf probes | [`logger.md`](./logger.md) |
| Storage payloads + keys | [`../src/data/DATA_CONTRACT.md`](../src/data/DATA_CONTRACT.md) |

