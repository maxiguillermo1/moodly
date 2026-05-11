## Moodly architecture (10‑minute onboarding)

This is the **canonical** architecture doc. The root `ARCHITECTURE.md` file is just a pointer here.

### Layer model (plain English)

- **Screens (`src/screens/`)**: user intent + orchestration (“what happens when the user taps?”)
- **Components (`src/components/`)**: reusable UI (“how it looks / renders”)
- **Hooks (`src/hooks/`)**: reusable UI wiring (React‑only helpers)
- **Pure rules** (`src/utils/` and shared **`src/lib/**`** helpers): deterministic utilities (no React, no navigation, no persistence imports). Optional empty **`src/domain/`**, **`src/logic/`**, **`src/insights/`** directories are wired in ESLint for future extraction; today most pure helpers ship under **`src/utils`** / **`src/lib`**.
- **Storage facade (`src/storage/`)**: the **only** persistence API UI should import
- **Storage implementation (`src/data/storage/`)**: AsyncStorage + caching + validation + quarantine + write locks
- **Security (`src/security/`)**: privacy‑safe logger + redaction + console patch
- **Perf probes (`src/perf/`)**: dev‑only observability (hitch detector, `perf.report`, list profiler summaries)
- **Theme/runtime appearance (`src/theme/`)**: `AppThemeProvider`, system palettes, tokens, persisted light/dark preference
- **Types (`src/types/`)**: shared TypeScript shapes (entries, mood grades, settings)

### State management (today)

There is **no global client store** (no Redux Toolkit / Zustand). State is composed of:

- **React component state / refs** per screen for UI and ephemeral flows (modals, scroll, selections).
- **React Navigation** for route state (tabs + stack modal for Settings).
- **`AppThemeContext`** for resolved appearance + design tokens (`useAppTheme()`).
- **Async persistence** via `src/storage`; session RAM caches updated **after** successful writes (`src/data/storage/*`).

### Repo map (“where do I put this?”)

- **Bootstrap**: `src/app/RootApp.tsx`
- **Navigation**: `src/navigation/` (`RootNavigator.tsx`, `CalendarStack.tsx`, `FloatingTabBar.tsx`)
- **Calendar hot paths**:
  - `src/screens/CalendarScreen.tsx` (month timeline)
  - `src/screens/CalendarView.tsx` (year pager)
  - `src/components/calendar/MonthGrid.tsx` + `src/components/calendar/monthModel.ts`
- **Storage + contract**:
  - Public API: `src/storage/index.ts`
  - Contract: `src/data/DATA_CONTRACT.md`
  - Entries: `src/data/storage/moodStorage.ts`
  - Settings: `src/data/storage/settingsStorage.ts`

### Import rules (enforced by ESLint)

These rules exist to prevent accidental performance/privacy regressions:

- **UI (screens/components/hooks)**:
  - ✅ may import: `components`, `utils`, `theme`, `types`, `security`, `storage`, `perf` (dev‑only)
  - ❌ must not import: AsyncStorage, `src/data/storage/*`, deep `src/data/*`, or deep `src/lib/*`
- **Pure layers** (`utils` and, if present, `domain`/`logic`/`insights` folders named in ESLint):
  - ✅ may import: `types` (+ other pure helpers inside `src/utils`/`src/lib` as allowed by rules)
  - ❌ must not import: React, React Native, navigation, **`storage`** or **AsyncStorage**
- **Storage implementation (`src/data/`)**:
  - ✅ may import: `security` (logger), pure validation helpers
  - ❌ must not import: screens/components/navigation

See `eslint.config.cjs` for the exact restrictions.

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
- Avoid state updates during scroll; use refs + deferred work (`InteractionManager`) for non‑urgent operations.

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
| New engineer onboarding | `ENGINEERING_HANDOFF.md` |
| Folder tree | `docs/PROJECT_STRUCTURE.md` |
| Design tokens + appearance | `docs/DESIGN_SYSTEM.md` |
| Reusable UI + storage façade | `docs/COMPONENTS.md` |
| Testing | `docs/TESTING.md` |
| Performance index | `docs/PERFORMANCE.md` |
| Owner decisions / invariants | `docs/DECISIONS.md` |
| Logging + perf probes | `docs/logger.md` |
| Storage payloads + keys | `src/data/DATA_CONTRACT.md` |

