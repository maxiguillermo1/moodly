# Changelog

Notable product-facing changes and the **release train** are recorded here. Dated engineering notes also live in [`summary.md`](./summary.md).

## Versioning and maturity

Moodly is intentionally **pre-1.0**. The repository uses a calm, engineering-driven maturity model:

| Line | Meaning |
|------|--------|
| **v0.x** | Foundation and refinement: architecture evolves, local-first reliability hardens, navigation and scroll paths stay smooth, accessibility and polish deepen. |
| **v1.0** | Target **public-ready** local-first platform: compatibility posture, export/import stability, and documented recovery semantics. |
| **v2.x+** | Reserved for **major platform expansion** (multi-device coordination, advanced analytics ecosystem, optional AI-assisted surfaces) only after v1 establishes trust. |

**Semver** in `package.json`, `app.json` `expo.version`, and **`APP_RELEASE_VERSION`** (`src/constants/app.ts`) must stay **one string**. That number is the **app release train**, not the same thing as JSON `version` fields inside specific storage blobs (for example, the **goals on-disk record** has its own revision history — see [`GOALS_ENGINE.md`](./GOALS_ENGINE.md)).

### Historical product milestones (narrative)

- **v0.1** — Initial local-first mood tracking prototype.  
- **v0.2** — Calendar and journal foundation.  
- **v0.3** — Habits and extensions system.  
- **v0.4** — Goals, Reminders, and architecture unification (repositories, day shards, write serialization).  
- **v0.5** — Performance and frame stability, architecture cleanup, **Daily Activity** read model, navigation fluidity, data safety, accessibility, interaction polish (**0.5.0**).  
- **v0.6** — *Current:* **Insights & Reflection Engine** foundation: deterministic local summaries, gentle observations, `insightsRepository` (**0.6.0**).

### Upcoming

- **v0.7+** — Stability, data ownership UX, and on-device ecosystem refinement.  
- **v1.0** — When the bar in [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) is met for a public-ready Moodly platform.

---

## [0.6.0] — Moodly v0.6 · Insights & Reflection foundation · 2026-05-12

**Theme:** Local-first, deterministic **reflection** over existing stores — no cloud, no chatbot, no hidden scores. UI surfaces can adopt later via `insightsRepository` + `InsightArtifact.messageKey` / `params`.

### Engineering

- **`insightsRepository`** (`src/data/repositories/insightsRepository.ts`) — `getWeeklyInsightBundle`, `getMonthlyInsightBundle`; composes **`getDayActivityRange`** + **`goalsRepository.getGoals()`** + `buildPeriodMetrics`.
- **`runReflectionEngine`** (`src/lib/insights/reflectionEngine.ts`) — gentle, non-judgmental insight list; stable ids; week-over-week comparisons only when the prior window has signal.
- **Supporting modules** — `trendCalculators`, `summaryGenerators`, `moodOrdinal`, `periodBounds`, `insightCatalog` (default English templates for tests/dev; UI should i18n `messageKey`).
- **Tests** — `insightsRepository.test.ts`, `reflectionEngine.test.ts`, `trendCalculators.test.ts`, `insightCatalog.test.ts`.
- **Docs** — [`docs/INSIGHTS.md`](./INSIGHTS.md) (architecture, privacy, boundaries).

---

## [0.5.0] — Moodly v0.5 · 2026-05-11

**Theme:** Foundation stabilization, honest pre-1.0 labeling, and continued polish without changing the calm product surface described below.

### Product / UI

- Unified **mood + note** editing via **`MoodEntryFields`**: same **MOOD / NOTE** labels, compact grade control, note field styling, and placeholder (**“Add a short note…”**) on **Today**, **Calendar** day sheet, and **Journal** editor.
- **Floating tab bar**: wider glass capsule, improved horizontal spacing, **larger active tab icon**, refined inactive/active indicator.
- **Today** card: calendar-aligned **Save** (system blue), shared typography with calendar sheet header; **Settings** uses **glass capsule** gear (default `ScreenHeader` behavior). Optional **extensions stack** below the card (**Habits**, **Goals**, **Reminders**) when enabled in Settings — strips use the same **secondaryBackground** + hairline borders as grouped content where applicable.
- **Reminders**: stack screen **`Todo`** with user-facing title **“Reminders”** — hot per-day lists live in **`moodly.tasks.day.<YYYY-MM-DD>`** shards while recurrence/metadata stays in **`moodly.tasks`** (legacy **`moodly.dayTodos`** migrates once), optional **in-app** time-of-day cues, **Goals**-style indigo alarm well on the **Today** strip; full screen uses bordered lists aligned with **Today** canvas (**`s.background`**).
- **Goals**: functional local Goals foundation with active/completed/archived states, progress history, Today preview, and local-first persistence under **`moodly.goals`**.
- **Settings → About**: version reads from **`APP_RELEASE_VERSION`** (kept in sync with `app.json` / `package.json`).

### Engineering

- New **`src/constants/`** for release metadata (`APP_RELEASE_VERSION`, display name, codename).
- Removed duplicate modal field styles from **`CalendarScreen`** where superseded by **`MoodEntryFields`**.
- **`package.json`**: **`npm run typecheck`** (`tsc --noEmit`).
- **GitHub Actions**: `.github/workflows/ci.yml` runs **lint**, **typecheck**, **tests** (with `TZ=America/Los_Angeles`), **`expo-doctor`**, and **`npm run export:bundles-check`** on pushes/PRs to **`main`** (job timeout **20 minutes**).

### Security & performance (verified in this pass)

- **Demo seed** remains **dev-only** (`seedDemoEntriesIfEmpty` returns immediately when `!__DEV__`).
- **Console** remains patched at entry via **`installSafeConsole`** (redacted args; production silencing per `patchConsole.ts`).
- **Logger** contract unchanged: metadata-only structured logs; no journal text in logs.
- No new network surfaces or secrets introduced; **no required `.env`** for this app.

### Engineering — production hardening (ongoing, 2026-05)

- **`app.json`**: `scheme` (**`moodly`**), **`ios.bundleIdentifier`**, **`android.package`** (defaults **`com.moodly.app`** — replace before final App Store registration if needed).
- **Calendar load**: **`fetchMoodCalendarSnapshot`** in **`src/data/storage/calendarSnapshot.ts`** (parallel entries index + settings); **CalendarScreen** / **CalendarView** consume one snapshot path.
- **Date helpers**: **`src/lib/utils/dateKeys.ts`** (calendar day/month mapping); **`parseISODate`** / display formatters hardened against malformed keys (**`src/lib/utils/date.ts`**).
- **Reliability**: **`AppErrorBoundary`** wraps navigation inside **`AppThemeProvider`** (**`src/app/AppErrorBoundary.tsx`**); logs **`app.boundary.render`** (error name only).
- **EAS stub**: root **`eas.json`** with **development** / **preview** / **production** profiles (run **`eas init`** / link project when ready).
- **npm scripts**: **`doctor`** (`expo-doctor`), **`export:ios-check`**, **`export:bundles-check`** (native bundle sanity; output under **`.tmp-expo-export/`**, gitignored).
- **Tests added**: **`calendarSnapshot.test.ts`**, **`entry.test.ts`** (validators), existing **`dateKeys`** / **`monthModel`** coverage retained.
- **`src/lib/utils/afterNextFrame`**: shared defer helper for calendar screens (via **`src/utils`** re-exports).
- **`react-native-draggable-flatlist`** on **Reminders** open list; Jest mocks in **`jest.setup.ts`**.
- **Day extensions module**: `src/extensions/` (scope, registry, memo slots), **`DayExtensionsHostContext`**, **`useDayTodos`** / **`useTodayHabitStripModel`** (focused load), todo pure helpers under **`src/lib/todos/`** re-exported from **`src/utils`**.
- **Goals + Tasks foundation**: normalized task/goal models, repositories, storage write locks, corruption quarantine, defensive copies, bounded goal history/milestones, date-scoped legacy task migration, deterministic local-date recurrence helpers, and focused regression coverage.
- **Storage hot paths**: day-scoped Reminders use `moodly.tasks.day.<YYYY-MM-DD>` shards and `moodly.tasks.dayIndex`, Today Goals uses lightweight summaries, recurrence generation is bounded/incremental, and soak timings split app hot paths from validation harness work.
- **iOS release readiness**: added `npm run validate:ios-release`, explicit iOS display/encryption metadata, App Store Connect privacy/review answers, and verified the iOS gate (`30` Jest suites / `130` tests, storage stress `39` tests, Expo Doctor `17/17`, iOS export, production audit `0 vulnerabilities`).

### Documentation

- **README**, **CHANGELOG**, **DESIGN_SYSTEM**, **PROJECT_STRUCTURE**, **TESTING**, **APP_STORE_READINESS**, **DECISIONS**, **WEB_DEPLOYMENT_CHUNKS** (web roadmap), **ENGINEERING_HANDOFF**, **SECURITY_CHECKLIST**, **AGENTS**, **COMPONENTS**, **architecture**, **DATA_CONTRACT**, **summary**, and related pointers updated for **Moodly v0.5** maturity labeling, extensions, Reminders, and ongoing release prep.

---

## Earlier

- **Mood grade color style (Solid ↔ Gradient)** — Persisted **`moodGradeColorStyle`**. **Gradient** uses per-grade **`mood` + `moodGradientMid`** and shared **`moodBloomAccent` (`#FFB7E5`)** at **0% / 70% / 100%** on a **135° TL→BR** `LinearGradient`. **Solid** uses **`mood`** only. Applies across calendar, **`MoodPicker`**, badges, journal rows, etc.
