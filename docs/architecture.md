## Moodly Architecture (Team-Scalable Guide)

This is the canonical architecture guide for Moodly.

> Note: On some macOS filesystems, `docs/ARCHITECTURE.md` and `docs/architecture.md` cannot coexist.
> We treat **this file** as the source of truth, and `ARCHITECTURE.md` at repo root points here.

### Repo map (mental model)

Beginner-friendly “where do I put this?” map:

- **`src/app/`**: app bootstrap & wiring (providers, navigation container, startup tasks)
- **`src/screens/`**: full screens (composition + user intent only)
- **`src/components/`**: reusable UI components (calendar/mood/ui subfolders)
- **`src/navigation/`**: navigators + tab bar only
- **`src/storage/`**: local persistence + caching + parsing + corruption quarantine (AsyncStorage only here)
- **`src/logic/`**: pure rules + canonical model (no React, no storage)
- **`src/insights/`**: pure derived selectors/aggregations (daily/weekly/monthly/streaks)
- **`src/security/`**: redaction/logger/console patch helpers
- **`src/utils/`**: small, pure helpers (date formatting, throttles, calendar math)
- **`src/theme/`**: design tokens only
- **`src/types/`**: shared TypeScript types

Legacy surfaces (kept for compatibility; prefer the folders above):
- `src/data/*`, `src/domain/*`, `src/lib/*`

### Folder responsibilities (single source of truth)

- **Screens**
  - Own: layout composition, wiring user intent to domain/data calls.
  - Avoid: heavy transforms, analytics math, persistence details.

- **Components**
  - Own: reusable rendering primitives and feature components.
  - Avoid: calling data/storage directly.

- **Logic (`src/logic`)**
  - Own: invariants, validation helpers, deterministic transforms (canonical “rules of the system”).
  - Must be: pure and deterministic (same input → same output).
  - Must not: import React / React Native / navigation / AsyncStorage.

- **Insights (`src/insights`)**
  - Own: deterministic derived views (aggregations/selectors) built on validated data.
  - Must not: import React / AsyncStorage.

- **Storage (`src/storage`)**
  - Own: AsyncStorage access, caching, in-flight coalescing, corruption quarantine, versioning hooks.
  - Must not: import screens/components/navigation.

### Import rules (direction)

- `screens` → may import: `components`, `logic`, `insights`, `storage`, `security`, `utils`, `theme`, `types`
- `components` → may import: `logic`/`insights` (pure), `security`, `utils`, `theme`, `types`
- `logic`/`insights`/`utils` → may import: `types` (+ other pure modules), but **not** React/navigation/storage
- `storage` → may import: `types`, `logic` (validation), `security` (logger/redaction)
- No “upward” imports: storage/logic/insights must not import screens/components/navigation

### Common patterns (standardize these)

- **Data loading in screens**
  - Prefer `useFocusEffect(useCallback(() => { load(); }, [load]))`
  - Keep `load*` callbacks memoized with `useCallback`
  - Avoid heavy sync work during transitions; defer via `InteractionManager.runAfterInteractions` where appropriate

- **Error handling / logging**
  - UI code never calls `console.*`
  - Use `logger` (`src/lib/security/logger.ts`) and log metadata only

- **List rendering**
  - Memoize `renderItem`, `keyExtractor`, and derived list props (`contentContainerStyle`, `viewabilityConfig`)
  - Avoid creating inline objects inside `renderItem` loops for hot lists/grids

### Adding a new feature (example)

If you add “Weekly Insights” (no UI guidance here — just file placement):

- **Domain**: `src/domain/insights/weekly.ts` (pure selectors)
- **Data**: `src/data/insights/weeklyRepository.ts` (storage reads/writes if needed)
- **UI**: `src/screens/WeeklyInsightsScreen.tsx` (orchestration only)
- **Exports**: add to `src/domain/index.ts` and/or `src/data/index.ts` if it’s part of the public surface

### Reference docs

- **Data contract**: `src/data/DATA_CONTRACT.md`
- **Root pointer**: `ARCHITECTURE.md`

