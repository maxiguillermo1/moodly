## Moodly architecture (10‑minute onboarding)

This is the **canonical** architecture doc. The root `ARCHITECTURE.md` file is just a pointer here.

### Layer model (plain English)

- **Screens (`src/screens/`)**: user intent + orchestration (“what happens when the user taps?”)
- **Components (`src/components/`)**: reusable UI (“how it looks / renders”)
- **Hooks (`src/hooks/`)**: reusable UI wiring (React‑only helpers)
- **Pure rules (`src/utils/`, `src/logic/`, `src/insights/`)**: deterministic helpers/selectors (no React, no storage)
- **Storage facade (`src/storage/`)**: the **only** persistence API UI should import
- **Storage implementation (`src/data/storage/`)**: AsyncStorage + caching + validation + quarantine + write locks
- **Security (`src/security/`)**: privacy‑safe logger + redaction + console patch
- **Perf probes (`src/perf/`)**: dev‑only observability (hitch detector, `perf.report`, list profiler summaries)
- **Theme/types (`src/theme/`, `src/types/`)**: design tokens + shared types

### Repo map (“where do I put this?”)

- **Bootstrap**: `src/app/RootApp.tsx`
- **Navigation**: `src/navigation/`
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
- **Pure layers (`utils`/`logic`/`insights`)**:
  - ✅ may import: `types` (+ other pure helpers)
  - ❌ must not import: React, React Native, navigation, storage
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

### Reference docs

- **Engineering handoff**: `ENGINEERING_HANDOFF.md`
- **Owner decisions**: `docs/DECISIONS.md`
- **Logging contract**: `docs/logger.md`
- **Data contract**: `src/data/DATA_CONTRACT.md`

