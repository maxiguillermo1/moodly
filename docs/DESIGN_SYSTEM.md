# Moodly design system

## Visual and interaction polish (Moodly v0.6)

- **Emotional timeline first:** calendar **month** and **year** mood treatments should read as **memory surfaces** (soft, legible color fields) — not analytics heatmaps or dense dashboards.
- **Shared mood entry block**: `MoodEntryFields` (`src/components/mood/MoodEntryFields.tsx`) drives **Mood / Note** labeling, compact segmented grades, and the note field on **Today**, **Calendar day sheet**, and **Journal editor** for one coherent pattern.
- **Tab bar**: `FloatingTabBar` uses **LiquidGlass** with slightly **wider capsule**, **tuned icon scale** (active vs idle), and a **subtle bottom indicator** for the selected tab.
- **Typography & spacing**: Prefer **`spacing[4]`** horizontal rhythm on sheet headers; **footnote + uppercase** section labels for mood entry; **Save** actions use **system blue** where the product specifies primary actions (Today card header, calendar/journal modals).
- **Appearance**: Unchanged contract — **Settings → Appearance** (**Auto / Light / Dark**) and **Solid / Gradient** mood surfaces remain the single source of truth via `AppThemeProvider`.

---

This describes the **implemented** styling layer: tokens, theme runtime, accessibility hooks, and key UI primitives. Use it when adding screens or polishing layout.

---

## Runtime theme (`AppThemeProvider`)

- **Source of truth**: `src/theme/AppThemeContext.tsx`
- **Wiring**: mounted in `src/app/RootApp.tsx` **outside** navigation so stacks/tabs inherit the same palette. **`AppErrorBoundary`** wraps **`SafeAreaProvider`** + **`NavigationContainer`** **inside** the provider so themed fallback colors are available if a subtree throws.
- **Resolved appearance**:
  - User preference: **`system`** (follow OS), **`light`**, or **`dark`** (`AppearancePreference` in `src/types/settings.types.ts`).
  - Persisted in settings storage (`appearance` field); hydrated on startup via `getSettings()` in the provider effect.
  - Resolved `colorScheme` drives **`system`** palette selection (`systemLight` / `systemDark` from `src/theme/systemPalettes.ts`).
- **`useAppTheme()`** exposes:
  - `system`: iOS-aligned semantic colors (label, separators, accents, fills).
  - `glass`: blurred-surface tint tokens used by `LiquidGlass`.
  - `semantic`: derived helpers (`createSemantic`).
  - `isDark`, `colorScheme`, `fontScale`, `windowWidth`, `windowHeight`.
  - **Accessibility**: `a11y.reduceMotion`, `reduceTransparency`, `invertColors`, `boldText`, `preferStrongSeparators`, plus separator strengthening when needed.
  - **`setAppearancePreference`**: persists via `settingsStorage` and updates React state immediately.
  - **`moodGradeColorStyle`** + **`setMoodGradeColorStyle`**: persists via `settingsStorage` (`AppSettings.moodGradeColorStyle`); default **`solid`**.
- **`ThemedStatusBar`**: Expo `StatusBar` style tracks resolved light/dark (and invert-colors accessibility).

### Expo `app.json` note

- `userInterfaceStyle` is **`"automatic"`** so **native chrome** (splash, status bar tint where Expo applies defaults) tends to track the **system** light/dark style. Inside React screens, palettes still come from **`AppThemeProvider`**; when the user pins **Light** or **Dark** in **Settings → Appearance**, that overrides the resolved scheme regardless of OS.

### Web preview (`npm run web`)

Expo web is **supported for dev/preview** only until you follow **`docs/WEB_DEPLOYMENT_CHUNKS.md`**. Expect differences in **blur (`LiquidGlass`)**, **haptics**, and **safe-area** handling compared to iOS; verify opaque fallbacks still meet contrast goals.

### Native splash screen (`expo-splash-screen`)

Configured in **`app.json`** (+ **`plugins`**) so the **launch splash** respects system light/dark on **standalone / dev builds**:

| Mode | Background | Notes |
|------|------------|--------|
| **Light** | `#F2F2F7` | Matches `systemLight.background` (“Settings” canvas feel). |
| **Dark** | `#000000` | Matches `systemDark.background`. |

- **Asset**: `./assets/images/splash-icon.png` is a minimal **transparent 1×1** PNG — the splash is intentionally **solid color–only**. Replace this file with a real wordmark/asset (recommended ~1024px with transparency); keep paths in **`app.json`** aligned.
- **Expo Go** does not faithfully reflect custom splash surfaces; validate with **`expo run:ios`**, **`expo run:android`**, or **EAS** preview builds per [Expo splash docs](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/).

---

## Tokens (single source files)

| Concern           | Module                      | Typical usage                                      |
|------------------|-----------------------------|----------------------------------------------------|
| Spacing / radius | `src/theme/spacing.ts`       | `spacing[4]`, `borderRadius.lg`, `borderRadius.full` |
| Typography       | `src/theme/typography.ts`   | Shared text styles (`body`, `title2`, …)           |
| System palettes   | `src/theme/systemPalettes.ts` | `label`, `separator`, `blue`, `fill`, …        |
| Semantic layer   | `src/theme/createSemantic.ts` | Built from `system` at runtime                    |
| Calendar density | `src/theme/calendarDensity.ts` | Font caps + month timeline padding vs width/Dynamic Type |
| Legacy re-exports | `src/theme/colors.ts`      | **`mood`**, **`moodGradientMid`**, **`moodBloomAccent`**, **`moodBackground`** · prefer `useAppTheme` for chrome |

Do **not** hardcode hex grays in new UI unless there is a documented exception (e.g. white text on mood fill).

---

## Surfaces: `LiquidGlass`

- **Component**: `src/components/ui/LiquidGlass.tsx` (exported from `src/components`).
- **Behavior**:
  - Uses `expo-blur` when available and when **Reduce Transparency** is off.
  - Falls back to a semi-opaque fill from `glass.background` when blur is disabled or unavailable.
  - Optional **border** + **shadow** for depth (used on the floating tab bar and Settings appearance control).
- **Usage today**: floating tab bar (`src/navigation/FloatingTabBar.tsx`); Settings appearance segmented capsule (`SettingsScreen`).

---

## Navigation chrome

- **Floating tab bar**: `FloatingTabBar.tsx` — centered capsule, `LiquidGlass`, safe-area **bottom** inset via `useSafeAreaInsets()`, icon + dot indicator.
- **Tabs**: `Calendar` (stack with month + year), `Today`, `Journal`. Initial tab: **Today** (`RootNavigator.tsx`).
- **Settings**: presented as a **modal** stack screen (`presentation: 'modal'`) from `ScreenHeader` gear; not a fourth tab.

## Today extensions (Habits, Goals, Reminders)

- **Layout**: Below the **Today** mood card, **`TodayExtensionsPanel`** renders a **stack of day-scoped slots** (memoized in **`src/extensions/dayExtensionSlots.tsx`**) — **Habits** (chips), **Goals** (starter row), **Reminders** (alarm-well row + quick add). The same extension components can appear inside **Journal** / **Calendar** day editors when wrapped with **`DayScopeProvider`** and the host’s **`onBeforeDetailNavigate`**.
- **Visual rhythm**: Match **Settings** / mood sheet grouping — **`secondaryBackground`** panels, **`StyleSheet.hairlineWidth`** borders using **`system.separator`**, **`borderRadius.lg` / `xl`** per screen. **Reminders** strip uses an **indigo** icon well (**`alarm-outline`**) consistent with **Goals**’ orange well.
- **Policy**: **`ExtensionsPolicyContext`** (from theme) decides which slots exist; keep toggles and order in sync with **`AppSettings`** (`todayTodoEnabled`, `todayExtensionsOrder`, …).

---

## Safe areas

- Root: `SafeAreaProvider` in `RootApp`.
- Screens generally use `SafeAreaView` with **`edges={['top']}`** where the bottom is intentionally padded for the **floating** tab bar (e.g. list `paddingBottom: 120`).
- **Modal / sheet** flows use **`edges={['top', 'bottom']}`** where the bar should clear the home indicator (Settings, journal edit modal, calendar quick-edit modal).

---

## Calendar visuals

- **Full grid layout metrics** (cell size, gap, dot size, today ring): `src/components/calendar/fullGridLayout.ts` — keeps the month card width math consistent with `MonthGrid`.
- **Mood style**: `dot` vs `fill` is user-configurable (Settings → Theme); stored as `calendarMoodStyle` in app settings.
- **Mood grade color style**: **`solid`** (`mood` only) vs **`gradient`** — **135°** `LinearGradient` (**TL→BR**): **`mood`** (0%) → **`moodGradientMid`** (70%) → **`moodBloomAccent`** `#FFB7E5` (100%; `Settings → Appearance`), via **`moodGradeBloom.ts`** / **`MoodGradeSurface`**.

---

## Haptics

- Centralized in `src/system/haptics.ts`; used for toggles, saves, sheet open, and selection feedback where appropriate.

---

## Moodly UX constitution (calm + iOS-native)

**Full narrative (product + agents):** [`AGENTS.md`](./AGENTS.md). This section captures **visual and motion rules** that belong next to tokens.

### Always aim for

- **Apple-level minimalism** — few controls per screen, generous whitespace where the product already uses it, grouped **`secondaryBackground`** panels.
- **Soft hierarchy** — hairline separators, semantic labels (`label` / `secondaryLabel` / `tertiaryLabel`), no loud borders.
- **Fluid, purposeful motion** — short, legible transitions; respect **Reduce Motion** (`useAppTheme().a11y`).
- **Tactile feedback** — `Touchable` / `CapsuleButton` + `haptics` for confirmations; avoid raw `Vibration`.
- **Consistent list density** — calendar cells and journal rows follow established typography caps (`calendarDensity`, list styles); do not cram extra metrics into cells without a product decision.
- **Floating tab bar awareness** — screens that hide the bar while scrolling must use the patterns in **`docs/AGENTS.md`** (scroll hook + `useShowTabBarOnScreenBlur`).

### Never (without an explicit product redesign)

- **Dashboard overload** on **Today** — giant stat cards, dense KPI strips, or secondary features competing with mood/note.
- **Harsh visual noise** — thick dark outlines, stacked heavy shadows, arbitrary rainbow accents.
- **Corporate tables** in emotional surfaces (journal timeline, mood sheet) — keep tabular density for settings-only flows unless product asks otherwise.
- **Aggressive color** — meaning comes from mood accents and system semantic colors, not from saturating every row.

### Interaction quality

Scroll performance on **Calendar** and **Journal** is part of UX. Follow **`docs/perf-calendar.md`** and **`docs/PERFORMANCE.md`** when changing list implementations, cell render paths, or storage reads on focus.
