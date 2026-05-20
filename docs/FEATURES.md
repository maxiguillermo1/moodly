# Kairo — feature map & relationships

**Canonical product + engineering rules:** [`AGENTS.md`](./AGENTS.md). **Persistence keys:** [`../src/data/DATA_CONTRACT.md`](../src/data/DATA_CONTRACT.md). **Layers:** [`architecture.md`](./architecture.md). **Where files live (features ↔ paths):** [`CODEBASE_MAP.md`](./CODEBASE_MAP.md).

This page answers: *what features exist, how they connect, and where they live in code.*

---

## Source layout (navigation aid)

Kairo uses **layer-first** folders (`components/`, `data/`, …) plus **`src/features/*/screens/`** for route-level UI. For a plain-English map of each product area to those paths, see **[`CODEBASE_MAP.md`](./CODEBASE_MAP.md)** — prefer that over duplicating large trees here.

## Core pillars (emotional timeline first)

| Pillar | User-facing role | Primary code |
|--------|------------------|----------------|
| **Year & month mood map** | **Primary artifact:** emotional color memory across time (year pager + month grid) | `CalendarView` (year), `CalendarScreen`, `MonthGrid`, mood styles from settings, `calendarSnapshot` |
| **Mood + note** | Daily check-in that **feeds** the color timeline + short reflection | `MoodEntryFields`, `useMoodEntry`, `moodStorage` |
| **Journal** | Past entries timeline — **memory text** beside the colors | `JournalScreen`, `JournalEditModal` |
| **Today** | Same-day mood/note **above** optional extensions (extensions never outrank the map story) | `TodayScreen`, `TodayExtensionsPanel` |

### Supporting surfaces (context, not identity)

Habits, goals, and reminders **contextualize** stretches of the emotional map; they must stay **optional**, **compact**, and **non-dominant** in navigation weight. See [`AGENTS.md`](./AGENTS.md) § Product hierarchy.

---

## Day extensions (secondary surfaces)

Rendered below the mood sheet on **Today**, and inside **Journal / Calendar** day flows when wrapped with `DayScopeProvider`.

| Extension | Purpose | Full-screen / deep UI | Storage / hooks |
|-----------|---------|-------------------------|-----------------|
| **Habits** | **Lightweight emotional context** for a day (possible influences on a colored stretch) | `HabitsScreen` | `habitSelectionsStorage`, `habitTrackingStorage`, `useTodayHabitStripModel` |
| **Goals** | **Long-horizon intention** preview — not a KPI surface | `GoalsScreen`, `TodayGoalsExtension` | `goalsStorage`, `getTodayGoalSummaries` |
| **Reminders** | Day-scoped list + optional time-of-day cue (logistics, not identity) | Route **`Todo`** → `TodoScreen`, `TodayTodoExtension` | `tasksStorage` + day shards, `useDayTodos` |

**Ordering / toggles:** `AppSettings` + `ExtensionsPolicyContext` (`todayExtensionsOrder`, feature flags).

---

## Reminders vs normalized tasks

- **What users mostly see:** `DayTodoItem` rows — title, done, sort order, optional `reminderMinutes` (in-app only).
- **What exists for scale / evolution:** full **`Task`** model under `kairo.tasks` (subtasks, recurrence, lists, tags, history). Not every field has a dedicated UI yet; agents must **read screens** before assuming parity.

---

## Settings & appearance

- **Settings** modal: appearance (Auto/Light/Dark), mood grade style (solid/gradient), calendar mood style, extension toggles/order, habits configuration.
- **Theme runtime:** `AppThemeProvider` + `useAppTheme()`.

---

## Cross-cutting systems

| System | Role |
|--------|------|
| **Navigation** | Tabs: Calendar / Today / Journal + modal Settings + stack screens (Habits, Goals, Todo, …) |
| **Logging** | `logger` via `src/security` — metadata only |
| **Perf (dev)** | `src/perf` screen markers, probes — see `docs/logger.md`, `PERFORMANCE.md` |
| **Quality gates** | `validate`, `validate:ios-release`, `validate:release` — see `docs/TESTING.md`, root `README.md` |

---

## What Kairo deliberately avoids (today)

See [`AGENTS.md`](./AGENTS.md) § Kairo identity and [`ROADMAP.md`](./ROADMAP.md): no cloud sync/account in core product, no OS push notification scheduling in the foundation slice, no AI pipeline — those are **future** tracks that must preserve calm, privacy, and the **emotional timeline as the hero surface**.
