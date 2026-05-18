# Project structure (mechanical map)

**Product meaning + where to add features:** [`AGENTS.md`](./AGENTS.md), [`FEATURES.md`](./FEATURES.md). This file is a **folder tree** only.

Abbreviated layout of **`src/`** as implemented. Ignore `node_modules/`, `.expo/`, `ios/`, `android/` unless you are shipping a dev client.

```
App.tsx                 # Re-exports src/App (Expo AppEntry resolves App from project root)
src/
  App.tsx               # Gesture handler + safe console + RootApp
  app/                  # RootApp bootstrap, AppErrorBoundary, AppThemeProvider, NavigationContainer, SafeAreaProvider
  components/           # Reusable UI — ui/, mood/, calendar/, habits/, todayExtensions/, todo/ — see docs/COMPONENTS.md
  constants/            # Release metadata (APP_RELEASE_VERSION) — keep in sync with app.json / package.json
  data/
    persistence/        # Schema version rail, bootstrap, KeyValueStore, migrations
    repositories/       # Domain facades over storage implementations
    storage/            # AsyncStorage implementations, day shards, write locks — UI imports via src/storage
    model/              # Entry type + validators (entry.test.ts)
    DATA_CONTRACT.md
  hooks/
  extensions/            # DayScope + extension registry + memoized slots (Habits / Goals / Reminders)
  lib/                  # calendar math, dateKeys, goals/, todos/, … (UI uses facades for some)
  navigation/           # Root navigator, Calendar stack, FloatingTabBar
  perf/
  features/             # Route screens per area (today, journal, calendar, …) — see src/features/README.md
  screens/              # Barrel index.ts re-exporting feature screens for short imports
  security/             # Logger + installSafeConsole façade for UI
  storage/              # Public persistence façade
  system/               # haptics, interaction queue
  theme/
  types/
  ui/                   # Touchable abstraction
  utils/                # Pure helpers re-exported for screens

assets/
  images/
    splash-icon.png

app.json
eas.json
package.json

docs/                   # Developer guides — [index](./README.md)
  README.md
  AGENTS.md
  CONTRIBUTING.md
  architecture.md
  ENGINEERING_HANDOFF.md
  SECURITY_CHECKLIST.md
  summary.md
  ...

README.md
LICENSE
```

Root **`README.md`** and **`LICENSE`** are the only long-form docs at the repo root besides this map’s structural files.

### Folders ESLint mentions but does not ship yet

- `src/domain/`, `src/logic/`, `src/insights/` — **optional future** pure-code homes; today most pure helpers live in **`src/utils`** and `src/lib/**`. Adding these directories is fine if they stay free of React, navigation, and storage imports (see `eslint.config.cjs`).

### Ownership examples

- New Today extension UI: `src/components/todayExtensions/`, registry wiring in `src/extensions/`, persistence in `src/data/storage/`, public access through `src/storage`.
- New goal/task model logic: `src/types/*`, pure helpers in `src/lib/goals/` or `src/lib/todos/`, storage in `src/data/storage/`, public APIs through `src/storage`. Day-scoped Reminder hot paths use `moodly.tasks.day.<YYYY-MM-DD>` shards.
- New pure date/calendar helper: `src/lib/calendar/` or `src/lib/utils/`, then export through `src/utils` only if UI needs it.
- New storage-backed domain: `src/data/storage/` for implementation, `src/data/repositories/` for future swappable facade, tests beside the storage module.
- New screen-local modal: keep it under the owning feature’s `screens/` folder unless multiple screens use it.
- New UI primitive: `src/components/ui/` for product-styled components, `src/ui/` for low-level touch/system abstractions.
