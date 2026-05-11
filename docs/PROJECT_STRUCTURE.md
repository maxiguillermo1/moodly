# Project structure (mechanical map)

Abbreviated layout of **`src/`** as implemented. Ignore `node_modules/`, `.expo/`, `ios/`, `android/` unless you are shipping a dev client.

```
src/
  app/               # RootApp bootstrap, SafeAreaProvider, NavigationContainer, AppThemeProvider
  components/        # Reusable UI (ui/, mood/, calendar/) — see docs/COMPONENTS.md
  constants/         # Release metadata (APP_RELEASE_VERSION) — keep in sync with app.json / package.json
  data/
    storage/         # AsyncStorage implementations, caches, queues, chaos — UI imports via src/storage
    model/           # Entry type + validators
    DATA_CONTRACT.md
  hooks/             # useMoodEntry, useTodayKey, …
  lib/               # calendar math, utilities, logging implementation, security logger impl (UI uses facades)
  navigation/        # Root navigator, Calendar stack, FloatingTabBar
  perf/              # Dev-only probes, Profiler wrapper, screen hooks
  screens/           # Full-screen flows (Calendar, Today, Journal, Settings, journal/)
  security/          # Logger + installSafeConsole façade for UI (impl under src/lib)
  storage/           # Public persistence façade (re-exports src/data/storage)
  system/            # haptics, accessibility observers, interaction queue
  theme/             # Tokens, AppThemeContext, palettes, typography
  types/             # Shared TS types
  ui/                # Thin Touchable abstraction
  utils/             # Pure date/format helpers exported to screens

App.tsx             # Registers gesture handler + safe console + launches RootApp

assets/
  images/
    splash-icon.png   # Placeholder pixel; Expo splash backgrounds are themed in app.json (replace with branded art)

docs/               # Architecture, perf, decisions, design system (canonical with code)
ENGINEERING_HANDOFF.md
README.md
```

### Folders ESLint mentions but does not ship yet

- `src/domain/`, `src/logic/`, `src/insights/` — **optional future** pure-code homes; today most pure helpers live in **`src/utils`** and `src/lib/**`. Adding these directories is fine if they stay free of React, navigation, and storage imports (see `eslint.config.cjs`).
