# Reusable components (UI map)

**Product hierarchy (Today vs extensions) and calm-UX rules:** [`AGENTS.md`](./AGENTS.md). This file lists **implemented components** and export barrels.

Use this when deciding whether to **extend an existing primitive** or add a one-off in a screen.

---

## Export surfaces

- **Barrel**: `src/components/index.ts` re-exports `ui`, `mood`, `habits`, **`calendar`**, **`todayExtensions`**, and **`todo`**.
- **UI primitives** (`src/components/ui/index.ts`):
  - `ScreenHeader` — large title row + optional **left** / **right** accessories + optional settings. Props: `titleNumberOfLines`, `contentPaddingHorizontal`, `rightAccessory`, **`titleVisualSize`** (`compact` uses smaller title, e.g. Habits).
  - `LiquidGlass` — blur / glass material wrapper (see `docs/DESIGN_SYSTEM.md`).
  - `CapsuleButton` — calendar-style capsule controls (back, icon, label variants).
  - `GroupedSection`, `GroupedRow` — Settings-style grouped lists (inset separators, symbol wells).
  - `SheetGrabber` — drag affordance for page sheets.
- **Mood** (`src/components/mood/`): `MoodEntryFields` (shared **Mood / Note** block + optional **`belowNote`** slot for calendar sheet / journal), `MoodPicker`, `MoodBadge`, `MoodGradeSurface` (solid vs gradient moods from **Settings → Appearance**).
- **Habits** (`src/components/habits/`): `HabitChip`, `HabitChipGroup`, `HabitListRow` / `HabitListRowSeparator` (checklist rows on **Habits** screen), `HabitsSettingsRow` (under **Settings → Extensions**), `TodayHabitExtensions` (below the Today mood card; respects toggle + per-day persistence).
- **Calendar** (`src/components/calendar/`): `MonthGrid`, `WeekdayRow`, layout helpers (`fullGridLayout`, `monthModel`, etc.).
- **Today extensions** (`src/components/todayExtensions/`): **`TodayExtensionsPanel`** (hosts the extension stack below the mood card on **Today**; day sheets pass **`DayScopeProvider`** + **`onBeforeDetailNavigate`** so **Reminders** / Goals push cleanly), **`TodayTodoExtension`** / **`TodayGoalsExtension`**, **`TodoTodaySettingsRow`** (Reminders toggle + open screen), **`HabitsSettingsRow`**, etc.
- **Reminders / todo** (`src/components/todo/`): **`TodoTaskRow`** (swipe delete, optional drag handle, clock to set **`reminderMinutes`**), **`TodoReminderPicker`** (preset times + clear). Full list lives on **`TodoScreen`** (user-facing **“Reminders”**).

### Extension policy (theme)

- **`ExtensionsPolicyProvider`** (**`src/theme/ExtensionsPolicyContext.tsx`**, wired from **`AppThemeContext`**) exposes which slots are enabled (`todayTodoEnabled`, …). **`dayExtensionRegistry`** skips inactive extensions.

---

## Touch targets

- Prefer `src/ui/Touchable.tsx` for press feedback consistent with the app (used across screens and grouped rows).
- Keep minimum **44×44** touch targets; use `hitSlop` when visuals are smaller.

---

## Screen-specific modals

- **Journal entry editor**: `src/features/journal/screens/JournalEditModal.tsx` — `Modal` + **`MoodEntryFields`** + sheet chrome; modal wrapper stays screen-local.

---

## Storage “API” (for UI)

There is **no HTTP API**. Persistent reads/writes go through:

- **Import from**: `src/storage` (re-exports `src/data/repositories`, which delegate to `src/data/storage/*`).
- **Contract / keys**: `src/data/DATA_CONTRACT.md`.
- **Do not** import `@react-native-async-storage/async-storage` or `src/data/**` from screens (ESLint guardrails).

Common entry points (non-exhaustive): `getEntry`, `upsertEntry`, `deleteEntry`, `getEntriesSortedDesc`, **`getJournalEntriesSortedDescSnapshot`** (Journal list hot path — do not mutate), **`getCalendarEntriesByMonthIndexSnapshot`**, `getSettings`, **`fetchMoodCalendarSnapshot`** (calendar month/year loaders), `setAppearancePreference` (via theme), `setCalendarMoodStyle`, `setHabitsEnabled` (via theme), `getHabitSelectionsForDate`, `toggleHabitForDate`, **`getDayTodosForDate`**, **`addDayTodo`**, **`setDayTodoDone`**, **`setDayTodoReminder`**, **`deleteDayTodo`**, **`reorderOpenDayTodos`**, **`clearCompletedDayTodos`**, `clearAllEntries`, `clearAllHabitSelections`, session warmup helpers consumed in `RootApp`. Copy semantics: `src/data/DATA_CONTRACT.md` § Mood / journal read APIs.
