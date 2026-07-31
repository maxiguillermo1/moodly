# PROJECT_MANIFEST.md — Agent Entry Point

**Purpose:** Machine-friendly project summary for AI coding agents. Humans should start with [README.md](README.md).

**Last verified:** 2026-07-30  
**Repository:** kairo  
**Version:** 0.6.0

---

## Identity

| Field | Value |
|-------|-------|
| **Name** | Kairo |
| **Domain** | Local-first mental wellness (mood + journal) |
| **Status** | Pre-1.0 (v0.6.0) — refining foundations |
| **License** | MIT |
| **Platforms** | iOS, Android (primary); web preview optional |
| **Bundle ID** | `com.maxiguillermo.kairo` |
| **Deep link scheme** | `kairo://` |

---

## What this project does

Kairo is a calm, local-first mood and journal app. Users log daily mood grades and notes, browse a year-scale color calendar, and optionally use habits, goals, and reminders as supporting context. Data stays on device by default; optional Supabase cloud sync is available when env vars are configured. No account required for core journaling.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| **Language** | TypeScript 5.3+ |
| **Framework** | Expo SDK ~54, React Native 0.81.5, React 19.1.0 |
| **Navigation** | React Navigation v7 (bottom tabs + native stack) |
| **Local data** | expo-sqlite, AsyncStorage, JSON blobs behind `src/storage` façade |
| **Optional cloud** | Supabase (`@supabase/supabase-js` 2.105.4) — opt-in via env |
| **Lists / perf** | @shopify/flash-list, react-native-reanimated 4.1.1 |
| **Build / deploy** | EAS Build (`eas.json`), `app.config.ts` |
| **Test** | Jest 29 + jest-expo ~54, ESLint 9 |

---

## Repository layout

```text
kairo/
├── App.tsx                 # Expo entry (re-exports src/App)
├── app.config.ts           # Expo name, slug, bundle IDs, env
├── eas.json                # EAS build profiles
├── package.json            # Scripts, dependencies, version
├── src/
│   ├── App.tsx             # Gesture handler, safe console, RootApp
│   ├── bootstrap/          # RootApp, AppErrorBoundary, splash
│   ├── cloud/              # Optional Supabase auth + sync
│   ├── components/         # Reusable UI
│   ├── data/               # repositories, storage, persistence, sync
│   ├── extensions/         # Day-scoped extension slots (habits/goals/todos)
│   ├── features/           # Route screens by product area
│   ├── navigation/         # React Navigation
│   ├── security/           # Logger, redaction, console patch
│   ├── storage/            # Public persistence façade (UI imports here)
│   └── theme/              # AppThemeProvider, tokens
├── supabase/migrations/    # Postgres schema for optional cloud sync
├── docs/                   # Full developer documentation (54 files)
└── .hermes/                # Engineering standards and policies
```

---

## Key commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install dependencies |
| `npm run start` | Start Expo dev server (Metro) |
| `npm run ios` / `npm run android` | Native simulator runs |
| `npm run validate` | Typecheck + lint + test |
| `npm run validate:release` | Full release gate (CI uses this) |
| `npm run validate:ios-release` | iOS App Store candidate gate |
| `npm run test:storage-stress` | Persistence stress tests |
| `npm run build:ios:production` | EAS production iOS build |
| `npm run doctor` | Expo Doctor diagnostics |

---

## Architecture (summary)

```text
Screens/components → src/storage (façade) → src/data/storage → SQLite + AsyncStorage
                                              ↓ (optional)
                                         src/cloud → Supabase
```

- **No global client store** — React state + navigation + `AppThemeContext` + async persistence.
- **ESLint import boundaries** — UI never imports AsyncStorage or deep `src/data/*`.
- **Local `YYYY-MM-DD` date keys** — never UTC derivation.

**Canonical detail:** [ARCHITECTURE.md](ARCHITECTURE.md) · [docs/architecture.md](docs/architecture.md) · [TECHNICAL.md](TECHNICAL.md)

---

## Data & configuration

| Item | Location |
|------|----------|
| **Expo config** | `app.config.ts`, `eas.json` |
| **Storage contract** | `src/data/DATA_CONTRACT.md` |
| **SQLite database** | `kairo.db` on device |
| **AsyncStorage prefix** | `kairo.*` |
| **Secrets / env** | `.env` (local only) — see `.env.example` |
| **Supabase schema** | `supabase/migrations/` |

Optional env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `APP_VARIANT`.

---

## Engineering standards

Read before editing:

1. [docs/AGENTS.md](docs/AGENTS.md) — product constitution
2. [.hermes/README.md](.hermes/README.md) — policy index
3. [.hermes/PROJECT_STANDARDS.md](.hermes/PROJECT_STANDARDS.md) — quality gates
4. [.hermes/ARCHITECTURE_PRINCIPLES.md](.hermes/ARCHITECTURE_PRINCIPLES.md) — design invariants
5. [CONTRIBUTING.md](CONTRIBUTING.md) — workflow

---

## Testing workflow

```bash
npm run validate                    # standard gate
npm run test:storage-stress         # persistence changes
npm run validate:release            # native/config/Metro/EAS changes
```

Jest runs with `TZ=America/Los_Angeles`. Calendar and date tests depend on local-day semantics.

---

## Deployment

- **Dev:** `npm run start` → Expo Go or dev client
- **Store:** EAS Build profiles in `eas.json` (`development`, `preview`, `production`)
- **Guide:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

```bash
npm run validate:release
npm run build:ios:production    # or build:android:production
npm run submit:ios              # after TestFlight QA
```

---

## Constraints (do not violate)

- UI imports **`src/storage` only** — never AsyncStorage or `src/data/storage/*`
- Date keys are **local `YYYY-MM-DD`** — never `toISOString().slice(0,10)`
- **No sensitive logging** — use `logger` from `src/security`, not `console.*`
- **Persist-first writes** — RAM caches update only after storage succeeds
- **No silent data loss** — serialize writes, quarantine corruption
- **Local-first default** — cloud sync is opt-in, not required for core use
- **Emotional timeline is primary** — do not reframe as productivity dashboard
- **Do not commit secrets** — run `npm run check:secrets` before release

---

## Important files

| File | Why it matters |
|------|----------------|
| `src/App.tsx` | Early bootstrap: gesture handler, safe console |
| `src/bootstrap/RootApp.tsx` | Providers, navigation, storage prime |
| `src/storage/index.ts` | Public persistence API for UI |
| `src/data/DATA_CONTRACT.md` | Storage keys and blob schemas |
| `eslint.config.cjs` | Import boundary enforcement |
| `app.config.ts` | Bundle IDs, version, icons |
| `docs/AGENTS.md` | Product constitution for agents |
| `docs/architecture.md` | Canonical layer model and import rules |

---

## Documentation map

| Audience | Start here |
|----------|------------|
| **Beginner** | [README.md](README.md) |
| **Contributor** | [CONTRIBUTING.md](CONTRIBUTING.md) |
| **Engineer** | [TECHNICAL.md](TECHNICAL.md) |
| **Agent** | This file + [docs/AGENTS.md](docs/AGENTS.md) |
| **Full index** | [docs/README.md](docs/README.md) |
