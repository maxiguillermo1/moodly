# Reusable components (UI map)

Use this when deciding whether to **extend an existing primitive** or add a one-off in a screen.

---

## Export surfaces

- **Barrel**: `src/components/index.ts` re-exports `ui`, `mood`, and `calendar`.
- **UI primitives** (`src/components/ui/index.ts`):
  - `Badge` — small status / count chip.
  - `ScreenHeader` — large title row + optional settings affordance (navigates to `Settings` modal by default).
  - `LiquidGlass` — blur / glass material wrapper (see `docs/DESIGN_SYSTEM.md`).
  - `CapsuleButton` — calendar-style capsule controls (back, icon, label variants).
  - `GroupedSection`, `GroupedRow` — Settings-style grouped lists (inset separators, symbol wells).
  - `SheetGrabber` — drag affordance for page sheets.
- **Mood** (`src/components/mood/`): `MoodEntryFields` (shared **Mood / Note** block for Today, calendar sheet, journal), `MoodPicker`, `MoodBadge`, `MoodGradeSurface` (solid vs gradient moods from **Settings → Appearance**).
- **Calendar** (`src/components/calendar/`): `MonthGrid`, `WeekdayRow`, layout helpers (`fullGridLayout`, `monthModel`, etc.).

---

## Touch targets

- Prefer `src/ui/Touchable.tsx` for press feedback consistent with the app (used across screens and grouped rows).
- Keep minimum **44×44** touch targets; use `hitSlop` when visuals are smaller.

---

## Screen-specific modals

- **Journal entry editor**: `src/screens/journal/JournalEditModal.tsx` — `Modal` + **`MoodEntryFields`** + sheet chrome; modal wrapper stays screen-local.

---

## Storage “API” (for UI)

There is **no HTTP API**. Persistent reads/writes go through:

- **Import from**: `src/storage` (re-exports `src/data/storage/*`).
- **Contract / keys**: `src/data/DATA_CONTRACT.md`.
- **Do not** import `@react-native-async-storage/async-storage` or `src/data/**` from screens (ESLint guardrails).

Common entry points (non-exhaustive): `getEntry`, `upsertEntry`, `deleteEntry`, `getEntriesSortedDesc`, `getSettings`, `setAppearancePreference` (via theme), `setCalendarMoodStyle`, `clearAllEntries`, session warmup helpers consumed in `RootApp`.
