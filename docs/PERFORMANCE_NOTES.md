# Performance notes (engineering)

Living document for **measurable, behavior-preserving** optimizations. Pair with [`PERFORMANCE.md`](./PERFORMANCE.md) and [`perf-calendar.md`](./perf-calendar.md).

### Habits (storage + Habits tab)

- **`habitSelectionsStorage`**: Warm-cache toggles avoid a **full-map re-parse on clone** (`cloneTrustedBundle` vs re-running `parseSelectionsRoot` on every RMW). Each write still runs **one** `sanitizeBundle` before `setItem`. **`toggleHabitForDate`** returns **`HabitToggleResult`** with **precomputed `markedDayCounts`** so the Habits screen does not call **`getHabitMarkedDayCounts`** again after every tap (saves a second O(days) scan + `getBundle` hop). Cold `getBundle` no longer double-sanitizes the disk read path.
- **Reality check**: AsyncStorage `setItem` is **not** a sub‑millisecond guarantee on device; UI should stay on **optimistic** state + haptics while persistence completes.

## 2026-05 — Runtime pass (launch, Today, calendar selection)

### Startup / root

- **`RootApp`**: `GestureHandlerRootView` uses a **module-level `StyleSheet`** for `flex: 1` instead of an inline object each render (tiny alloc reduction on every root re-render).
- **Cold path** was already deferred: demo seed + session cache warm run inside **`InteractionManager.runAfterInteractions`** (does not block first paint).

### Today tab

- **`useMoodEntry`**: `onSaveSuccess` / `onSaveError` are read via **refs** so **`save`’s identity** only depends on `date`, `mood`, and `note`. Avoids churning downstream memoization when parent passes fresh inline callbacks (default Today pattern).
- **`TodayScreen`**: **Stable `handleSave`** (`useCallback`); **`ScrollView`** reuses existing `styles.flex` instead of `{ flex: 1 }` per render.

### Habits strip (extensions)

- **`useTodayHabitStripModel`**: When **`habitsEnabled` is false**, the hook **skips** `getTrackedHabitIds` and `getHabitSelectionsForDate` on focus and marks `trackedReady` immediately. Disabled extensions avoid pointless AsyncStorage reads while the strip is off.

### Calendar month timeline

- **`CalendarScreen`**: **Selection haptic** — `useCalendarDayPress` calls **`haptics.select()`** synchronously on a valid day tap **before** `getEntry`, so the tap feels instant while AsyncStorage loads (cooldown + momentum rules in `haptics.ts` still apply). Dev-only **`perfProbe.breadcrumb('calendar.dayTap')`** improves hitch attribution.
- **`Touchable`** (global): Release spring tuned for **slightly snappier settle** (higher damping/stiffness, lower mass) — still UI-thread only; **no layout** change.
- **`CalendarScreen`**: **Selection state** (`selectedDate`) is mirrored into **`selectedDateRef`**; **`renderMonthItem`** reads the ref for `selectedForThisMonth` so the **callback identity does not change on every day tap**. **`extraData`** still includes `selectedDate`, so FlashList recycles visible rows correctly when selection changes (unchanged contract).

### Journal

- No change in this pass: list already uses **FlashList**, memoized row factory, **`extraData`** for theme-dependent rows, and **`getEntriesSortedDesc`** (session cache / sorted cache in storage).

## 2026-05 — Main tab + Today extension reconciliation

- **`FloatingTabBar`**: extracted **`TabItem`** as **`React.memo`** so changing the focused tab (or unrelated theme-driven parent renders) does not recreate **every** tab’s `onPress` closure and icon subtree.
- **`TodayExtensionsPanel`** + **`DayExtensionsStack`**: wrapped in **`React.memo`** so **mood / note** edits on **Today** do not remount Habits / Goals / Reminders extension slots when **`dateKey`** and policy are unchanged.

### Daily Activity (large ranges)

- **`dailyActivityRepository.getDayActivityRange`**: Reminder shard reads run in **chunks of 48** concurrent `getTasksForDate` calls (still one read per calendar day, but not thousands of parallel awaits). Mood/habits/goals remain **one snapshot each** per range compose. See `docs/DATA_ARCHITECTURE.md` § Daily Activity.

### How to verify

```bash
npm run lint && npm run typecheck && npm test && npm run export:bundles-check
```

On device, smoke: cold launch → Calendar scroll → day tap → Today save → Journal scroll with a large history.

## 2026-05 — Production readiness pass

### Runtime reliability without UX changes

- **`TodayScreen`** now uses the shared `useTodayKey()` observer instead of computing today during render, so an app left open across local midnight reloads the correct day without polling.
- **`useMoodEntry` / `useDayTodos`** use mounted/latest-request guards to prevent stale async completions from updating a screen after date changes or unmount. **`useDayTodos`** also serializes storage mutations through a FIFO queue (`createSerialEnqueue`) so parallel toggles/adds cannot reorder `setItems` vs disk.
- **Persistence bootstrap** retries after transient storage failures; one failed migration check no longer pins the session to a failed state.
- **Settings writes** now perform read-modify-write inside the serialized lock so rapid toggles keep sibling preferences intact.

### Known profiling watchpoints

- Calendar month timeline remains intentionally bounded and virtualized; future work can cache row-height arrays by grid metrics/window key if profiling shows a mount burst on older devices.
- The scroll-linked month peek fade is disabled for Reduce Motion; profile overdraw on the oldest supported devices before adding more visual layers.
