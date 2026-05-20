# AGENTS.md — Moodly master guide

**This file is the primary onboarding and constitution for humans and AI agents.** Read it before writing code so changes stay aligned with product identity, architecture, data safety, and CI.

**Cursor IDE:** shorter rules live in **`.cursor/rules/*.mdc`** — `moodly-core` (always on), `moodly-data-storage` (`src/data/**/*.ts`), `moodly-ui-screens` (`src/{screens,features,components,extensions}/**/*.tsx`). They echo the hard constraints here; **this document is the full source of truth.**

**Companion docs:** [`architecture.md`](./architecture.md) (layers, imports), [`CODEBASE_MAP.md`](./CODEBASE_MAP.md) (plain‑English map, **import aliases**, Mermaid diagrams), [`ZERO_COMPROMISE.md`](./ZERO_COMPROMISE.md) (quality bar), [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) (tokens, surfaces), [`DATA_ARCHITECTURE.md`](./DATA_ARCHITECTURE.md) + [`../src/data/DATA_CONTRACT.md`](../src/data/DATA_CONTRACT.md) (persistence), [`DAILY_ACTIVITY.md`](./DAILY_ACTIVITY.md) (composed cross-facet **read model**), [`INSIGHTS.md`](./INSIGHTS.md) (reflection engine + `insightsRepository`), [`NARRATIVE.md`](./NARRATIVE.md) (life timeline + `narrativeRepository`), [`SCALABILITY.md`](./SCALABILITY.md) (index of scale topics + cheat sheet), [`FEATURES.md`](./FEATURES.md) (feature map), [`ROADMAP.md`](./ROADMAP.md) (direction), [`TESTING.md`](./TESTING.md), [`PERFORMANCE.md`](./PERFORMANCE.md).

---

## Moodly identity

### The heart of the product (non‑negotiable)

Moodly is **not** primarily a productivity suite, a goals hub, a habit tracker, a reminders manager, or an AI assistant. Its **true core** is:

> **A beautiful emotional timeline of your life** — especially the **yearly color map of moods across time**.

That map is the **primary emotional artifact**: users should be able to **remember periods through color**, sense **seasons and phases**, and **revisit how stretches of life felt** — calm, private, and visually timeless. Everything else exists **only** to **support, enrich, contextualize, and deepen** that timeline — never to compete with it for attention or identity.

### Product hierarchy (evaluate every change against this)

When auditing habits, goals, reminders, insights, narrative, Daily Activity, Today, calendar, navigation, or extensions, ask: **“Does this strengthen the emotional timeline?”** If not, prefer to **simplify**, **reposition**, or **reduce prominence** rather than expanding scope.

1. **Mood timeline** — month and **year** views as the emotional memory surface (color as recall, not analytics).
2. **Reflection** — short notes and gentle prompts that attach meaning to days and seasons.
3. **Emotional continuity** — insights, narrative, and copy that connect time without judgment or gamification.
4. **Context systems** — habits, goals, reminders as **optional context** around *why a period might have felt the way it did* (never “maximize output”).
5. **Supporting insights** — sparse, trustworthy observations; never a dashboard of scores.

### What Moodly is

- A **calm, local-first emotional memory** anchored in **mood across time**, rendered as a **visual, year-scale color story** users can return to for years.
- **Apple-inspired**: minimal chrome, soft surfaces, native-feeling motion, premium restraint — tuned for **emotional calm**, not dashboard energy.
- **Mood- and memory-first** — journal, calendar, and Today **orbit** the timeline; throughput and “optimization” are non-goals.
- **Lightweight**: no accounts, no network for core use; data stays on device (AsyncStorage today).
- **Emotionally intelligent in tone**: observational, humble language; supportive without toxic positivity or pseudo-therapy.

### What Moodly is not

- **Not** a corporate planner, OKR tracker, or productivity command center.
- **Not** a habit or goals product **first** — those are **supporting context** for mood reflection, not the hero surface.
- **Not** a dense analytics product: the year map is **emotional memory visualization**, not a scoreboard (avoid cluttered metrics, competitive framing, and engagement loops).
- **Not** “feature maximalism” at the expense of calm layout, scroll performance, or **visual clarity of the mood map**.

### Why it exists

Moodly exists so people can keep a **private, beautiful record of how life felt** — and optionally add **gentle** structure (habits strip, long-horizon goals, day reminders) that **contextualizes** the colored timeline **without hijacking** it.

### Product maturity & versioning

Moodly uses a **deliberate pre-1.0** product line so the repository stays honest about scope: the app is **not unfinished noise** — it is **intentionally refining** toward a credible **v1.0** public-ready platform.

#### Moodly Product Maturity Model

| Phase | What it means |
|-------|----------------|
| **v0.x** | **Foundation + refinement:** architecture still evolving where needed, systems stabilizing, UI/UX polish and **local-first** reliability hardening, navigation and scroll performance treated as product quality, accessibility and data safety deepened. **Current:** **v0.6** (semver **0.6.0** in `package.json` / `app.config.ts` / `APP_RELEASE_VERSION`). |
| **v1.x** | **Stable public platform:** long-term compatibility posture, export/import stability, documented recovery, cloud or sync only with explicit consent and architecture review, interaction systems considered “settled.” |
| **v2.x+** | **Platform / ecosystem expansion:** optional AI-assisted insights, richer analytics, multi-device coordination, extensibility — **only after** v1 establishes trust and data ownership clarity. |

**Agents:** do not confuse **app semver** with **per-blob storage revisions** (e.g. goals record `version` in JSON). Those are migration rails, not the marketing product line — see [`CHANGELOG.md`](./CHANGELOG.md) § Versioning and [`GOALS_ENGINE.md`](./GOALS_ENGINE.md).

**Agents (v0.6 expectations):** prefer **stabilizing** and **emotionally clarifying** existing surfaces (especially **year/month mood timeline**, journal, Today, storage boundaries, read models) over speculative feature expansion without explicit product sign-off. **One** persistence façade for UI (**`src/storage`**). **One** calendar day identity rule (**local `YYYY-MM-DD`**). **Daily Activity** and similar APIs are **read models** — derived from canonical stores, not a parallel write path.

---

## Emotional design & UX inspirations

Moodly borrows **feel** from products people already trust for calm structure — e.g. **Apple Calendar, Journal, Reminders, Health**, and gentle habit metaphors (**Strides**, **Things**, **Structured**) — **without** importing their density wholesale.

The **yearly mood color field** should feel closer to **browsing meaningful memories** than to scanning analytics: emotional density at a glance, not a dashboard.

### Guardrail: inspirations, not imitation overload

Adding a feature because it exists elsewhere is **not** enough. Every addition must pass:

- Does it **strengthen the emotional timeline** (clarity, beauty, memory, continuity of the mood map)?
- Does it **preserve calm** and **low visual noise**?
- Does it **respect hot paths** (calendar, journal, Today scroll)?
- Does it **default to private/local** and avoid surprise logging or tracking?

If any answer is “no,” **do not ship** without an explicit product decision and docs update.

---

## How to work (order matters)

1. **Read this file** — identity, non-negotiables, and the area you will touch.
2. **Read the linked doc** for that layer ([`architecture.md`](./architecture.md), `DATA_CONTRACT`, `DESIGN_SYSTEM`, perf docs).
3. **Inspect nearby code** — match naming, hooks, theme usage, and storage APIs already used in that feature.
4. **Run the right gates** (§ Quality gates).
5. **Prefer small, reviewable diffs** — one concern per change unless the user asked for a broad pass.

Human process overlap: [`CONTRIBUTING.md`](./CONTRIBUTING.md). **Agents should still treat this file as authoritative** for Moodly-specific product and architecture rules.

---

## Non-negotiables

1. **User-visible behavior** — Do not change flows, layouts, animations, or persistence semantics unless the user explicitly asked for a behavior change.
2. **Storage boundaries** — UI imports **`src/storage`** only; never **`AsyncStorage`** or **`src/data/storage/*`** from screens, components, hooks, theme, navigation, app shells, or extensions.
3. **Date keys** — Calendar identity uses local **`YYYY-MM-DD`** only; never `toISOString().slice(...)` for day keys (ESLint enforces this).
4. **Logging** — No `console.*` in UI layers; use **`logger`** from **`src/security`** with **metadata only** (no journal text, full entries, or raw settings blobs).
5. **Local data safety** — Forward-only schema rail; each migration step is preceded by an automatic **`moodly.migrationBackup.*`** snapshot (see **`docs/DATA_SAFETY.md`** + **`docs/DATA_ARCHITECTURE.md`**). Internal full-export envelope for tools/tests: **`src/data/persistence/localExport/moodlyLocalExport.ts`**. New persisted keys require **`DATA_CONTRACT.md`** updates in the same PR.
6. **Accessibility & App Store readiness** — Ship only after **`docs/ACCESSIBILITY.md`** manual matrix (VoiceOver, Dynamic Type, Reduce Motion) on **physical devices** plus **`docs/RELEASE_CHECKLIST.md`** gates. Icon-only controls need labels; modals use **`accessibilityViewIsModal`** where implemented; respect **`a11y.reduceMotion`** for navigation and sheets.

See also [`ZERO_COMPROMISE.md`](./ZERO_COMPROMISE.md) for PR blockers and engineering defaults.

---

## Daily Activity (read model)

**Product:** A **single-day lens** that joins mood with *lightweight* context (habits, goals, reminders) so reflection and future insights can ask **“what else was true that day?”** — without turning Moodly into a productivity dashboard or overshadowing the **yearly mood color map**.

**Engineering:** `dailyActivityRepository` (`src/data/repositories/dailyActivityRepository.ts`) exposes **`getDayActivity`**, **`getDayActivityRange`**, **`getTodayActivity`** and returns a stable **`DayActivity`** DTO (`src/types/dailyActivity.types.ts`). It is **read-only**: it never writes `moodly.entries`, habits, goals, or reminder shards. **Source of truth** stays in existing stores; Daily Activity is **derived** and safe to recompute anytime.

- **Writes** remain domain-specific (`entriesRepository`, `extensionsRepository`, `goalsRepository`, `tasksRepository`, …).
- **Date identity** is local **`YYYY-MM-DD`** only (same rule as calendar; never UTC string slicing for day keys).
- **Performance:** range loads batch mood via one `getAllEntries`, habits via one selection snapshot, goals via one `getGoals`; per-day work is bounded (day reminder shards + in-memory assembly). See [`DAILY_ACTIVITY.md`](./DAILY_ACTIVITY.md) and [`DATA_ARCHITECTURE.md`](./DATA_ARCHITECTURE.md).
- **Tests:** `src/data/repositories/dailyActivityRepository.test.ts` covers empty/single-facet/full days, invalid keys, range behavior, truncation, and “reads never call `upsertEntry`.”

Screens are **not** required to adopt this API immediately; it exists so new logic can **centralize** day composition once instead of duplicating summaries across Today, Calendar, Journal, and Goals.

---

## Goals system

### Philosophy

Goals are **long-horizon intentions** that sit **beside** the emotional timeline — helping answer “what mattered in life during this colored stretch?” — **not** a primary optimization surface. They are **gentle momentum systems**, not KPI dashboards: closer to **quiet progress rings** than workplace OKRs.

- Prefer **meaning and continuity** over pressure; never let Goals chrome **dominate** the year map or month grid.
- Copy and UI should stay **non-judgmental**; avoid shame framing.

### Goal types (implemented)

Types are defined in `src/types/goals.types.ts` (`GoalType`). The **Goals** screen (`GoalsScreen.tsx`) labels them: **Habit**, **Daily target**, **Average**, **Project**.

| Type | Intent (product) | Implementation notes |
|------|------------------|----------------------|
| **habit** (`habit`) | Show up; binary or simple repetition | Logging uses value **`1`** per log action (`GoalsScreen`); `progress.frequency` tends to be **`daily`**. |
| **target** (`target`) | Hit a numeric target (e.g. per day) | User enters a numeric **log value**; `unit` often **`per day`**. |
| **average** (`average`) | Smooth numeric progress toward a mean target | Numeric logs; percent in `goalMath` uses **`currentValue / targetValue`** (clamped). |
| **project** (`project`) | Milestone-oriented work broken into steps | Uses **milestones**; insights lean toward “one milestone is enough to begin.” |

### Progress, streaks, and completion

- **Single engine**: `src/lib/goals/goalMath.ts` — **`canonicalizeGoalModel`** merges duplicate calendar days (latest `createdAt` wins), derives **`progress.currentValue` from `history` + `type`**, and feeds **`computeGoalProgress`** (percent, streak, `completedToday`, **`loggedDays`**, insight). Do not duplicate streak/percent math in UI.
- **Streak** (`goalStreak`): consecutive **local `YYYY-MM-DD`** days with **`history.value > 0`** after merge, walking backward from the reference day.
- **Percent** (`goalProgressPercent` / `computeGoalProgress`): with **`durationDays` as a positive number**, percent = distinct logged days / `durationDays`. **`durationDays: null`** (never-ending) → **0%** in math (UI still shows day-count copy). With **`durationDays` undefined**, percent uses derived **`currentValue / targetValue`** ( **`average`** = mean of daily values vs target; other types = sum of positive daily values vs target; clamped past 100%).
- **Completion** (`addGoalProgress`): **`goalLoggedDayCount`** (distinct days with `value > 0`) vs **`durationDays`** when set as a positive number, else vs **`progress.targetValue`** when `durationDays` is undefined; never-ending (`durationDays === null`) does not auto-complete.
- **Same-day logging**: **Replace** that calendar day’s row (value + note); bump **`createdAt`** on replace so merges stay deterministic. Re-saving the same value+note is a **no-op** (safe against double taps). Values are **`>= 0`**; invalid dates are rejected (`isValidISODateKey` / local day keys only).
- **Lifecycle**: **`active`** — listed in Today summaries, accepts logs. **`completed`** — history kept, no new logs, hidden from active Today strip. **`archived`** (“paused”) — history kept, no logs. **`deleteGoal`** removes the goal map entry. Use **`completeGoal(goalId)`** for explicit completion without logging.
- **Paused / completed writes**: **`addGoalProgress`** returns a clone without mutation for non-**`active`** goals.

### Persistence & performance

- **`moodly.goals`**: **`GoalsRecord`** at **`GOALS_RECORD_VERSION` 2** (`goalsStorage.ts`). Legacy **v1** payloads migrate on first read (idempotent), with a **`moodly.goals.migrate_backup.*`** snapshot of the pre-migrate JSON when upgrading from v1.
- **List / Today previews**: use **`getGoalSummaries`** for full sorted summaries; **`getTodayGoalSummaries`** only materializes **active** goals (sorted by `updatedAt`, then title) up to the limit — avoid cloning full histories on Today.
- Summary fields (**percent, streak, `completedToday`, `loggedDays`**) all come from **`computeGoalProgress`** so UI cannot drift from the canonical model.
- **Insights**: `buildGoalInsight` / `computeGoalProgress` generate short **encouraging** strings — keep new copy in that spirit.
- History is **capped** (`MAX_GOAL_HISTORY` in `goalsStorage.ts`); milestones capped (`MAX_GOAL_MILESTONES`).

### Goal reminders

`GoalReminder` supports **frequency** and optional **minutesFromMidnight** — treat as **in-app / UX cues** unless you later add **`expo-notifications`** with explicit permission and product copy.

---

## Reminders & task foundation

### Naming

- User-facing: **Reminders**. React Navigation route remains **`Todo`** (params `{ date?: string }`) for stability.

### Two layers (important for agents)

1. **Day list UX** — `TodoScreen` + `useDayTodos` operate on **`DayTodoItem[]`**: `title`, `done`, `sortIndex`, optional **`reminderMinutes`** (0–1439, **in-app cue only**), cap **`DAY_TODO_MAX_ITEMS_PER_DAY`**. This is the **simple, calm** Reminders experience aligned with Apple Reminders–style day lists.
2. **Normalized task foundation** — `TasksRecord` under **`moodly.tasks`** holds richer **`Task`** objects: **subtasks**, **tags**, **lists**, **recurrence**, **`TaskHistory`**, priorities, archive fields, etc. This exists for **evolution, migration, and bounded recurrence generation** — not all fields have first-class UI yet.

### Persistence (current)

- **Hot day reads/writes**: shards **`moodly.tasks.day.<YYYY-MM-DD>`** + index **`moodly.tasks.dayIndex`**.
- **Metadata / recurrence / history**: **`moodly.tasks`** (`TasksRecord`).
- **Legacy**: **`moodly.dayTodos`** is **migration input only** (migrated into tasks + shards).

### Recurrence engine

- **`generateDueTaskRecurrences(anchorDate, maxTasks?)`** in `tasksStorage.ts` walks templates, updates **`lastGeneratedDate`**, and is **bounded** to avoid runaway generation (see tests + `DATA_CONTRACT.md`).
- **Restart safety**: persisted **`lastGeneratedDate`** prevents duplicate occurrences after app restarts.

### What to document vs build

- **Do not** assume the full **`Task`** surface (subtasks, lists UI, etc.) is exposed in **TodoScreen** — check code before documenting UI.
- **Do** preserve **day-shard performance** and caps when extending Reminders.

---

## Today screen & day extensions

### Today hierarchy (non-negotiable product shape)

The **emotional timeline** (especially **year** and **month** mood color surfaces in Calendar) is the product’s **center of gravity**. **Today** is the **same-day** anchor for logging — not a productivity dashboard.

1. **Mood + note** live in the primary **sheet** (`TodayScreen` + `MoodEntryFields`) so each day adds honest color to the long arc.
2. **Extensions** (`TodayExtensionsPanel` → `DayExtensionsStack` + `dayExtensionRegistry`) are **secondary context**: **Habits**, **Goals**, **Reminders** slots below the sheet — lightweight signals that may help interpret a **period** on the map, not goals that steal the story.

### Rules for Today extensions

- **Compact**: strips use **small wells**, **tight typography**, and **low visual weight** — they must never feel like a second app dashboard.
- **Teaser vs full**: **`TodayTodoExtension`** / goals habits rows are **teasers**; rich interaction stays in **Goals / Reminders / Habits** screens.
- **Ordering & toggles**: `ExtensionsPolicyContext` + **`AppSettings`** (`todayExtensionsOrder`, `todayGoalsEnabled`, `todayTodoEnabled`, habits flags). Turning an extension off **does not delete** underlying value stores (see `DATA_ARCHITECTURE.md`).

### Host navigation

- **`DayExtensionsHostContext` `onBeforeDetailNavigate`**: dismiss host sheets before pushing **Reminders** / **Goals** so modals do not trap navigation.

---

## UI / UX standards

### Moodly should always feel

- **Soft, premium, fluid**, emotionally **calming**, and **native to iOS** in spacing and motion habits.
- **Intentionally uncluttered** — fewer, better pixels.

### Use the design system

- **Tokens**: `useAppTheme()`, **`spacing`**, **`typography`**, **`borderRadius`**, semantic colors from **`system`** palettes — see [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).
- **Surfaces**: grouped **`secondaryBackground`** panels, **`StyleSheet.hairlineWidth`** separators, rounded **`lg` / `xl`** cards where the product already uses them.
- **Primary actions**: system **blue** for primary saves/actions where established (Today card, journal/calendar modals).
- **Blur**: **`LiquidGlass`** respects **Reduce Transparency**; provide opaque fallbacks.

### Touch, haptics, icons

- **`Touchable`** / **`CapsuleButton`**; **`src/system/haptics`** for feedback — avoid ad hoc vibration APIs.
- **Hit targets**: respect Apple HIG minimums; see [`ACCESSIBILITY.md`](./ACCESSIBILITY.md) for VoiceOver / Dynamic Type / touch target notes.
- **Safe areas**: `react-native-safe-area-context`; tab roots often `edges={['top']}` with bottom padding for the **floating** tab bar; modals often include bottom.

### Never (unless explicitly redesigning the product)

- **Dashboard walls** — dense KPI cards, giant analytics modules, or “hub” layouts on **Today**.
- **Harsh chrome** — heavy black borders, stacked noisy shadows, rainbow accent explosions.
- **Productivity theater** — cluttered counters, redundant progress widgets, corporate tables in the journal/calendar emotional surfaces.

Fuller “never / always” list: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) § Moodly UX constitution.

---

## Interaction quality & iOS fluidity

Moodly should feel **responsive and tactile** — interaction quality is part of the product, not polish icing.

- **Scrolling**: calendar month timeline, journal lists, and Today scroll are **hot paths** — avoid synchronous heavy work in scroll handlers; prefer patterns already used (`FlashList`, deferred work, refs). See [`perf-calendar.md`](./perf-calendar.md) and [`PERFORMANCE.md`](./PERFORMANCE.md).
- **Navigation / tab focus**: schedule **storage-backed** refetches from **`useFocusEffect`** with **`InteractionManager.runAfterInteractions`** on primary surfaces (Today, Journal, calendar stack, Settings, Habits, Goals) so transitions stay fluid; **`useDayTodos`** already defers when the screen is focused. Do not move work *into* scroll handlers to compensate.
- **Tactile timing**: pair **immediate** light haptics (e.g. calendar **day tap** before async I/O) with **deferred** heavy work so taps feel responsive without blocking transitions — see **`useCalendarDayPress`** (shared hook) and [`PERFORMANCE_NOTES.md`](./PERFORMANCE_NOTES.md). Calendar focus loads use **`fetchMoodCalendarSnapshot`** deferred via **`InteractionManager.runAfterInteractions`** (month + year views).
- **Animations**: respect **`a11y.reduceMotion`**; prefer system-consistent timing; avoid gratuitous bouncy motion on data-heavy screens.
- **Keyboard**: use **`KeyboardAvoidingView`** patterns established on screens with text entry (Today, Todo, Goals, Journal).
- **Lists**: **`@shopify/flash-list`** where adopted; journal uses a constant toggle for rollback — do not rip out without measuring.
- **Tab bar**: screens that **hide** the floating tab bar while scrolling **must** pair with **`useShowTabBarOnScreenBlur`** (§ Floating tab bar).

**Principle:** when in doubt, choose **native fluidity and calm** over **feature density**.

---

## Architecture at a glance

| Concern | Location |
|--------|----------|
| App bootstrap | `App.tsx` → `src/App.tsx`, `src/app/RootApp.tsx` |
| Navigation | `src/navigation/` (`RootNavigator`, `FloatingTabBar`, stacks) |
| Screens | `src/features/*/screens/` (barrel: `src/screens/index.ts`) |
| Components | `src/components/` |
| Hooks | `src/hooks/` |
| Day extension system | `src/extensions/` (`DayScopeContext`, `dayExtensionRegistry`, `dayExtensionSlots`) |
| User-facing persistence API | **`src/storage/`** (re-exports repositories) |
| Repositories | `src/data/repositories/` |
| Storage implementation | `src/data/storage/` |
| Migrations / KV adapter | `src/data/persistence/` |
| Theme | `src/theme/` (`AppThemeProvider`, `systemPalettes`, tokens) |
| Security / logger | `src/security/` |
| Perf probes (dev) | `src/perf/` |

**State today:** no global Redux/Zustand store — **React state**, **navigation state**, **`AppThemeContext`**, and **async persistence** via `src/storage` with module caches in `src/data/storage/*`.

**Import rules:** UI must not import AsyncStorage or deep storage; pure utils must not import React or storage. See [`architecture.md`](./architecture.md) and `eslint.config.cjs`.

---

## Data, scale, and future evolution

**One-page index (routes + cheat sheet):** [`SCALABILITY.md`](./SCALABILITY.md).

### Philosophy

- **Local-first truth** on device; repositories abstract storage so **SQLite / sync** can land later without rewriting screens.
- **Normalize where it hurts** — e.g. tasks + day shards, goals record, entries — but **do not** prematurely expose every normalized field in UI.
- **Defensive copies** from storage reads in hot APIs; calendar snapshots use **stable references** where documented (`ARCHITECTURE_STATE.md`).
- **Corruption path**: validate → quarantine → safe defaults; never log user note content.

### Scalability direction

- **Shard** high-churn day data (Reminders day keys) rather than growing one unbounded JSON array for all history in a single key.
- **Bound** expensive loops: recurrence generation caps, history tail caps, max items per day.
- **Select** lightweight projections (`getGoalSummaries`, calendar snapshot) for render-heavy surfaces.

### Future sync / AI / collaboration

See [`ROADMAP.md`](./ROADMAP.md). **Guardrails:** optional features, privacy-forward, **no raw journal upload** without explicit opt-in, no manipulative engagement design — any future **AI** or **sync** must preserve **calm, minimalism, and fluidity**.

---

## Performance expectations

- **Launch & tab switches** should stay snappy; avoid blocking JS on cold paths.
- **Calendar / journal** are the most sensitive scroll surfaces — read [`PERFORMANCE_BENCHMARKS.md`](./PERFORMANCE_BENCHMARKS.md), [`PERF_RESULTS.md`](./PERF_RESULTS.md), and [`SOAK_TEST_REPORT.md`](../SOAK_TEST_REPORT.md) when touching them.
- **Storage**: prefer **O(day)** or **O(visible window)** work for Reminders hot paths; avoid full JSON reparses on every keystroke.
- **Do not claim** universal sub-millisecond timings — benchmarks are contextual; honesty matters.

---

## Testing expectations

| Area | Command / doc |
|------|----------------|
| Default CI unit + integration | `npm test` |
| Storage / corruption / ordering | `npm run test:storage-stress` |
| Soak / long-run harness | `npm run test:soak` — see [`TESTING.md`](./TESTING.md) for `SOAK_*` env vars |
| Full release gate | `npm run validate:release` |
| iOS-focused gate | `npm run validate:ios-release` |

**Expectations:** date math, persistence, recurrence, and calendar navigation changes **require tests** or an explicit, rare waiver with follow-up. Soak is opt-in but recommended when touching storage hot loops or timeline scrolling.

---

## Read first (by task)

| Task | Start here |
|------|------------|
| Any change | This file + [`architecture.md`](./architecture.md) |
| Storage / migrations | [`../src/data/DATA_CONTRACT.md`](../src/data/DATA_CONTRACT.md), [`DATA_ARCHITECTURE.md`](./DATA_ARCHITECTURE.md), [`DATA_SAFETY.md`](./DATA_SAFETY.md) |
| Today extensions / Reminders | This file § Today & Reminders, [`COMPONENTS.md`](./COMPONENTS.md), [`FEATURES.md`](./FEATURES.md) |
| UI / tokens | [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md), [`ACCESSIBILITY.md`](./ACCESSIBILITY.md) |
| Calendar / scroll perf | [`perf-calendar.md`](./perf-calendar.md), [`PERFORMANCE.md`](./PERFORMANCE.md) |
| Release / App Store | [`APP_STORE_READINESS.md`](./APP_STORE_READINESS.md), [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) |

---

## Quality gates (match CI expectations)

```bash
npm run typecheck && npm run lint && npm test
```

- **Storage work:** add `npm run test:storage-stress`.
- **iOS / App Store candidate work:** `npm run validate:ios-release`.
- **Cross-platform release / native bundling:** `npm run validate:release`.

---

## Where things live (feature map pointers)

| Concern | Location |
|--------|----------|
| Today tab | `src/features/today/screens/TodayScreen.tsx`, `MoodEntryFields`, `TodayExtensionsPanel` |
| Calendar | `src/features/calendar/screens/CalendarScreen.tsx`, `CalendarView.tsx`, `src/components/calendar/*` |
| Journal | `src/features/journal/screens/JournalScreen.tsx`, `JournalEditModal.tsx` |
| Reminders full UI | `src/features/reminders/screens/TodoScreen.tsx`, `src/components/todo/*`, `useDayTodos` |
| Goals full UI | `src/features/goals/screens/GoalsScreen.tsx`, `src/components/todayExtensions/TodayGoalsExtension.tsx` |
| Habits | `src/features/habits/screens/HabitsScreen.tsx`, `src/components/habits/*`, selections/tracking storage modules |
| Pure todo display helpers | `src/lib/todos/*` (re-exported through **`src/utils`** for UI import rules) |
| Goal math (streak / percent) | `src/lib/goals/goalMath.ts` |

---

## Reminders & extensions — technical detail

- **Hooks:** `useDayTodos(date)` loads on focus; mutations go through **`src/storage`**, serialized client-side with **`createSerialEnqueue`** so rapid taps cannot race `setItems` against each other.
- **Compatibility:** `dayTodosStorage.ts` acts as a façade; shard implementation lives in **`tasksStorage.ts`**.
- **Imports:** UI should use **`src/utils`** re-exports for todo helpers where ESLint restricts deep `lib` imports (`partitionDayTodos`, `formatReminderMinutes`, `minimalTodoExtensionTeaser`, …).

---

## Goals — technical detail

- **Paused / archived**: `archiveGoal`; progress blocked while archived.
- **Duration**: `durationDays` **`undefined`** = legacy/default target behavior; **number** = finite day run; **`null`** = never-ending day counter mode (see Goals UI copy and `goalMath`).

---

## Agent operating profiles

| Mode | Focus | Must run / read |
|------|--------|-----------------|
| iOS release | `app.config.ts`, `eas.json`, privacy, export | [`DEPLOYMENT.md`](./DEPLOYMENT.md), [`APP_STORE_READINESS.md`](./APP_STORE_READINESS.md), [`MOBILE_PRODUCTION_AUDIT.md`](./MOBILE_PRODUCTION_AUDIT.md), `npm run validate:ios-release` |
| Storage / data | Migrations, shards, locks, quarantine | `DATA_CONTRACT`, `DATA_ARCHITECTURE`, `npm run test:storage-stress` |
| Performance | Timeline, lists, storage hot loops, soak | [`PERFORMANCE_BENCHMARKS.md`](./PERFORMANCE_BENCHMARKS.md), [`PERF_RESULTS.md`](./PERF_RESULTS.md), `SOAK_TEST_REPORT.md` |
| UI / a11y | Tokens, motion, keyboard, VoiceOver | [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md), [`ACCESSIBILITY.md`](./ACCESSIBILITY.md) |

---

## Floating tab bar (scroll hide / show)

`TabBarAutoHideProvider` wraps the tab navigator (`RootNavigator.tsx`). **`FloatingTabBar`** consumes hide progress.

**Rule:** If a screen calls **`hideTabBar`** (directly or via **`useScrollDrivenTabBarVisibility`**), it **must** also call **`useShowTabBarOnScreenBlur(showTabBar)`** so tab switches never leave the bar stuck hidden.

| Pattern | When |
|--------|------|
| `useScrollDrivenTabBarVisibility()` | Vertical lists that should hide the bar while scrolling. |
| `useShowTabBarOnScreenBlur(showTabBar)` | **Always** pair with hide usage. |
| Custom (`CalendarScreen`) | Still use blur show hook alongside custom scroll logic. |

---

## Making high-quality changes

- **Stay in layer boundaries** — UI → `src/storage` only; calendar/date rules in **`src/lib/utils/date`** (and related helpers), not ad hoc.
- **Preserve performance contracts** — profile or follow existing deferral patterns when touching scroll or storage.
- **Test fragile domains** — dates, persistence, timeline virtualization ([`TESTING.md`](./TESTING.md)).
- **Document cross-cutting changes** — update this file, `DATA_CONTRACT`, or `architecture.md` when you introduce a **new persistent key**, **migration**, or **navigation/tab pattern**.

When in doubt, re-read **§ Non-negotiables** and match the **simplest existing pattern** in the same feature folder.
