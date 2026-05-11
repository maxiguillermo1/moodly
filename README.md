# Moodly

**Moodly V2** (release **2.0.0**) — local-first daily mood tracking with a refined, minimal iOS-native feel: shared **mood entry** patterns across Today, Calendar, and Journal; polished **liquid-glass** tab bar; and documentation aligned for production handoff. See **[docs/CHANGELOG.md](./docs/CHANGELOG.md)** for the full V2 notes.

Local-first daily mood + journaling (Calendar year view + month timeline + **Today** + **Journal**) built with **Expo** + **React Native** + **TypeScript**. No backend; data lives in **AsyncStorage**.

## Moodly V2 quick links

| Topic | Doc |
|-------|-----|
| What shipped in 2.0.0 | [`docs/CHANGELOG.md`](./docs/CHANGELOG.md) |
| Visual system (tabs, mood entry) | [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) |
| Folder map | [`docs/PROJECT_STRUCTURE.md`](./docs/PROJECT_STRUCTURE.md) |
| Security / logging | [`SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md), [`docs/logger.md`](./docs/logger.md) |

## Documentation index

| Doc | Purpose |
|-----|---------|
| [`ENGINEERING_HANDOFF.md`](./ENGINEERING_HANDOFF.md) | First-read onboarding (~10 min) |
| [`docs/architecture.md`](./docs/architecture.md) | **Canonical** architecture + import rules |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Pointer to `docs/architecture.md` |
| [`docs/PROJECT_STRUCTURE.md`](./docs/PROJECT_STRUCTURE.md) | Folder tree + where code lives |
| [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) | Theme tokens, `LiquidGlass`, safe areas, appearance |
| [`docs/COMPONENTS.md`](./docs/COMPONENTS.md) | Reusable UI surface + storage façade |
| [`docs/TESTING.md`](./docs/TESTING.md) | Jest commands and config |
| [`docs/PERFORMANCE.md`](./docs/PERFORMANCE.md) | Links to perf docs + Journal list notes |
| [`docs/perf-calendar.md`](./docs/perf-calendar.md) | Calendar hot-path playbook |
| [`docs/PERF_LIBRARIES.md`](./docs/PERF_LIBRARIES.md) | List libraries and adoption notes |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | Long-lived product/engineering decisions |
| [`docs/logger.md`](./docs/logger.md) | Privacy-safe logging + perf probe legend |
| [`src/data/DATA_CONTRACT.md`](./src/data/DATA_CONTRACT.md) | Storage keys + payload rules |
| [`docs/CHANGELOG.md`](./docs/CHANGELOG.md) | Product-facing changelog (high level) |
| [`SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md) | Privacy / App Store–style bar |
| [`docs/APP_STORE_READINESS.md`](./docs/APP_STORE_READINESS.md) | Polish + release checklist |
| [`summary.md`](./summary.md) | **Append-only** engineering changelog |

## Stack (current)

- **Expo SDK** ~54 (`expo` in `package.json`)
- **React Native** 0.81.x · **React** 19.x
- **Navigation**: React Navigation v7 (`native-stack`, bottom tabs)
- **Lists**: `@shopify/flash-list` (calendar month timeline + journal default), `FlatList` (year pager)
- **Blur / materials**: `expo-blur` (via `LiquidGlass`)

## Fresh install & run

```bash
npm install
npm run start
```

### Production / release checks

```bash
npm run lint
npm run typecheck
npm test
```

Then launch **Expo Go** (or a dev build) from the Expo CLI. Scripts: `npm run ios`, `npm run android`, `npm run web` as usual for Expo projects.

**Native splash (light vs dark)** is configured in `app.json` via **`expo-splash-screen`**. Expo Go shows its own launcher treatment; validate the real splash on **`npx expo run:ios` / `run:android`** or an EAS build (see `docs/DESIGN_SYSTEM.md`).

There are **no** required `.env` files.

## Quality gates (before a PR)

```bash
npm run lint
npm run typecheck
npm test
```

See [`docs/TESTING.md`](./docs/TESTING.md) for Jest details (`TZ`, `watchman: false`, etc.).

**CI:** pushes and PRs to `main` run lint, typecheck, tests, and `expo-doctor` via [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

## Product surface (routing)

- **Tabs** (`RootNavigator` → bottom tabs → `FloatingTabBar`): **Calendar**, **Today**, **Journal**.
- **Calendar**: nested stack — **CalendarView** (year pager) ⇄ **CalendarScreen** (month timeline).
- **Settings**: **modal** stack screen (not a tab); opened from the gear on `ScreenHeader` (where shown) or from Calendar’s top bar.
- **Appearance**: **Settings → Appearance** — segmented **Auto / Light / Dark** (persisted, applied via **`AppThemeProvider`**) and **Solid / Gradient** (**`moodGradeColorStyle`**). **Gradient** applies the design **135°** ramp: **`mood` → `moodGradientMid` → `moodBloomAccent`** (**`#FFB7E5`** at 100%) in `src/theme/moodGradeBloom.ts`.

## State & persistence (mental model)

- **No global Redux/MobX** — screen-level React state, React Navigation state, **`useAppTheme`**, storage-backed settings, and **`src/data/storage`** session caches after successful writes.
- **UI persistence imports**: **`src/storage`** only (implements `eslint.config.cjs` boundaries).

## Where to look (high-signal paths)

| Area | Path |
|------|------|
| Bootstrap + providers | `src/app/RootApp.tsx` |
| Release version constant | `src/constants/app.ts` (sync with `app.json` / `package.json`) |
| Theme / dark mode runtime | `src/theme/AppThemeContext.tsx` |
| Floating tab bar | `src/navigation/FloatingTabBar.tsx` |
| Navigation graph | `src/navigation/RootNavigator.tsx`, `CalendarStack.tsx` |
| Calendar month timeline | `src/screens/CalendarScreen.tsx` |
| Calendar year pager | `src/screens/CalendarView.tsx` |
| Journal timeline | `src/screens/JournalScreen.tsx` |
| Month grid hot path | `src/components/calendar/MonthGrid.tsx`, `monthModel.ts`, `fullGridLayout.ts` |
| Month matrix (6×7) | `src/lib/calendar/monthMatrix.ts` (via utils exports) |
| Storage façade (UI) | `src/storage/index.ts` |
| Entries implementation | `src/data/storage/moodStorage.ts` |
| Settings implementation | `src/data/storage/settingsStorage.ts` |
| AsyncStorage + chaos injection | `src/data/storage/asyncStorage.ts` |
| Privacy-safe logging façade | `src/security/index.ts` (impl `src/lib/security/logger.ts`) |
| Perf probes | `src/perf/probe.ts` |
| Lint boundaries | `eslint.config.cjs` |

## Key invariants (do not break casually)

- **Date keys are local-day** `YYYY-MM-DD` (no UTC slicing; `toISOString().slice(...)` is banned by ESLint).
- **Storage is untrusted**: safe parse + validate + quarantine/reset on corruption — never crash-loop.
- **Persist-first**: RAM caches update **after** AsyncStorage writes succeed.
- **Writes are serialized** (prevents lost updates from concurrent saves).
- **UI never imports AsyncStorage** or `src/data/**` directly — use **`src/storage`**.
- **Logs are privacy-safe**: metadata only; no notes/entries/settings payloads; **`no-console`** in UI layers (use `logger` from `src/security`).
- **Calendar hot paths stay allocation‑lean** (stable props/styles; defer non-urgent work off scroll paths).

## Troubleshooting

- **Long pauses in dev**: check `perf.report`. Phase **`DEV_METRO_OR_GC`** usually indicates Metro/GC/tooling noise, not production regressions.
- **Expo Go**: dev builds can hitch more than release; compare with probes, not anecdotes.
- **Jest on macOS**: Watchman disabled in config to avoid permission crashes (`docs/TESTING.md`).

## Changelog

Append-only milestone log: [`summary.md`](./summary.md).
