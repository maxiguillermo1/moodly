## Moodly Architecture (Team-Scalable Guide)

This is the canonical architecture guide for Moodly.

> Note: On some macOS filesystems, `docs/ARCHITECTURE.md` and `docs/architecture.md` cannot coexist.
> We treat **this file** as the source of truth, and `ARCHITECTURE.md` at repo root points here.

### Repo map (mental model)

- **`src/screens/`**: screen orchestration (UI + user intent). Keep screens thin.
- **`src/components/`**: reusable UI components (calendar/mood/ui subfolders).
- **`src/navigation/`**: navigators + tab bar (routing only).
- **`src/data/`**: persistence + caching + corruption quarantine (AsyncStorage access lives here).
- **`src/domain/`**: pure rules + selectors (no React, no storage).
- **`src/lib/`**: utilities + security/logging + legacy re-export surfaces.
- **`src/theme/`**: design tokens only.
- **`src/types/`**: shared TypeScript types.

### Folder responsibilities (single source of truth)

- **Screens**
  - Own: layout composition, wiring user intent to domain/data calls.
  - Avoid: heavy transforms, analytics math, persistence details.

- **Components**
  - Own: reusable rendering primitives and feature components.
  - Avoid: calling data/storage directly.

- **Domain (`src/domain`)**
  - Own: invariants, validation helpers, analytics selectors, deterministic transforms.
  - Must be: pure and deterministic (same input → same output).
  - Must not: import React / React Native / navigation / AsyncStorage.

- **Data (`src/data`)**
  - Own: AsyncStorage access, caching, in-flight coalescing, corruption quarantine, versioning hooks.
  - Must not: import screens/components/navigation.

### Import rules (direction)

- `screens` → may import: `components`, `domain`, `data`, `lib`, `theme`, `types`
- `components` → may import: `domain` (pure), `lib` (pure), `theme`, `types`
- `domain` → may import: `types`, `lib` (pure helpers), `data/model` + `data/analytics` (pure)
- `data` → may import: `types`, `domain` (pure validation/selectors), `lib/security` (logging/redaction)
- No layer should import “up” into UI (data/domain must not import screens/components)

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

