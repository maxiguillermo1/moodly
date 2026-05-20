# Performance notes (engineering)

Living document for **measurable, behavior-preserving** optimizations. Pair with [`PERFORMANCE.md`](./PERFORMANCE.md) and [`perf-calendar.md`](./perf-calendar.md).

### Habits (storage + Habits tab)

- **`habitSelectionsStorage`**: Warm-cache toggles avoid a **full-map re-parse on clone** (`cloneTrustedBundle` vs re-running `parseSelectionsRoot` on every RMW). Each write still runs **one** `sanitizeBundle` before `setItem`. **`toggleHabitForDate`** returns **`HabitToggleResult`** with **precomputed `markedDayCounts`** so the Habits screen does not call **`getHabitMarkedDayCounts`** again after every tap (saves a second O(days) scan + `getBundle` hop). Cold `getBundle` no longer double-sanitizes the disk read path.
- **Reality check**: AsyncStorage `setItem` is **not** a sub‑millisecond guarantee on device; UI should stay on **optimistic** state + haptics while persistence completes.

## 2026-05 — Runtime pass (launch, Today, calendar selection)

### Startup / root

- **`RootApp`**: `GestureHandlerRootView` uses a **module-level `StyleSheet`** for `flex: 1` instead of an inline object each render (tiny alloc reduction on every root re-render).
- **Cold path** was already deferred: demo seed + session cache warm run inside **`InteractionManager.runAfterInteractions`** (does not block first paint).
- **Expo dev load (2026-05):** `warmSessionStore` imports from **`src/storage/warm`** (not the full `storage` barrel) so Metro does not eagerly pull **`fullDemoSeed`** (~850 LOC). **`sessionRepository`** lazy-imports dev seed. **`RootNavigator`** uses **`getComponent`** for Calendar/Journal + stack modals so only **Today** is in the first phone bundle. **`metro.config.js`** blocklists `*.test.*` and `src/qa/` from the app graph; uses project-local **`.metro-cache/`** + **`cacheVersion`** keyed to repo path (run **`npm run start:clear`** after moving the folder). Babel aliases stay **relative** (no absolute `path.resolve` in transforms).
- **QR → first paint (2026-05):** Theme uses **`storage/settings`**, Today uses **`storage/entries`** (not `storage/index`). **`primeAppStorage()`** runs migrations + **`primeEntriesSessionCache`** in one coalesced promise at root mount; Calendar/Journal tab modules preload after warm. **`peekEntryFromSessionCache`** + **`useMoodEntry`** sync-hydrate Today; **save is optimistic** (success UI immediately, disk async). Dev hitch RAF is **opt-in** (`EXPO_PUBLIC_KAIRO_PERF_PROBE=1`). Floating tab bar skips stacked **blur in dev iOS Simulator**; tab hide/show timings shortened; habit strip loads after interactions.

### Today tab

- **`useMoodEntry`**: `onSaveSuccess` / `onSaveError` are read via **refs** so **`save`’s identity** only depends on `date`, `mood`, and `note`. Avoids churning downstream memoization when parent passes fresh inline callbacks (default Today pattern).
- **`TodayScreen`**: **Stable `handleSave`** (`useCallback`); **`ScrollView`** reuses existing `styles.flex` instead of `{ flex: 1 }` per render.

### Habits strip (extensions)

- **`useTodayHabitStripModel`**: When **`habitsEnabled` is false**, the hook **skips** `getTrackedHabitIds` and `getHabitSelectionsForDate` on focus and marks `trackedReady` immediately. Disabled extensions avoid pointless AsyncStorage reads while the strip is off.

### Calendar month timeline

- **`useCalendarDayPress`** (`src/hooks/useCalendarDayPress.ts`): shared hook — **`haptics.select()`** before **`getEntry`**, latest-tap-wins, **`calendar.dayTap`** breadcrumb. **`CalendarScreen`** uses an **inline** day handler with the same latest-tap-wins guards and **`CalendarScreen.dayTap`** culprit phase (hook optional for future consolidation).
- **`Touchable`** (global): Release spring tuned for **slightly snappier settle** (higher damping/stiffness, lower mass) — still UI-thread only; **no layout** change.
- **`CalendarScreen`**: **Selection state** (`selectedDate`) is mirrored into **`selectedDateRef`**; **`renderMonthItem`** reads the ref for `selectedForThisMonth` so the **callback identity does not change on every day tap**. **`extraData`** still includes `selectedDate`, so FlashList recycles visible rows correctly when selection changes (unchanged contract).

### Journal

- List uses **FlashList**, memoized row factory, and **`extraData`** for theme-dependent rows. Focus reload uses **`getJournalEntriesSortedDescSnapshot()`** (stable sorted-array identity on cache hits); **`getEntriesSortedDesc()`** remains for callers that need defensive copies.

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

## 2026-05 — Journal grouping refactor

- **`src/lib/journal/`**: section builders, solo filters, and **`scanJournalEntryPresence`** extracted from **`JournalScreen`**. Bucketing is **O(n)** on pre-sorted entries (no per-build **`O(n log n)`** re-sort). Header taps use the **O(n)** presence scan instead of rebuilding sections. Solo filter taps apply **O(sections)** filters on memoized base sections.

## 2026-05 — Storage + calendar timeline pass

- **`moodStorage`**: `upsertEntry` / `deleteEntry` read the warm session cache via `loadEntriesCacheIfNeeded()` instead of cloning the full record on every write. **`getJournalEntriesSortedDescSnapshot()`** returns stable sorted-array identity for Journal focus reloads (defensive **`getEntriesSortedDesc`** unchanged).
- **`CalendarScreen`**: aligned with **`fetchMoodCalendarSnapshot`** (parallel coalesced read, same as year view). **`CalendarTimelineMonth`** memo row wired in production. Card-width **`onLayout`** coalesced (rAF + scroll guard + flush on scroll end). FlashList **`overrideItemLayout`** uses per-month height math. Deferred recenter/window-extend work is **cancelled on blur**; **`calendarListEpoch`** bumps only when local today changes across blur (or while focused at midnight).

## 2026-05 — Production readiness pass

### Runtime reliability without UX changes

- **`TodayScreen`** now uses the shared `useTodayKey()` observer instead of computing today during render, so an app left open across local midnight reloads the correct day without polling.
- **`useMoodEntry` / `useDayTodos`** use mounted/latest-request guards to prevent stale async completions from updating a screen after date changes or unmount. **`useDayTodos`** also serializes storage mutations through a FIFO queue (`createSerialEnqueue`) so parallel toggles/adds cannot reorder `setItems` vs disk.
- **Persistence bootstrap** retries after transient storage failures; one failed migration check no longer pins the session to a failed state.
- **Settings writes** now perform read-modify-write inside the serialized lock so rapid toggles keep sibling preferences intact.

### Known profiling watchpoints

- Calendar month timeline remains intentionally bounded and virtualized; future work can cache row-height arrays by grid metrics/window key if profiling shows a mount burst on older devices.
- The scroll-linked month peek fade is disabled for Reduce Motion; profile overdraw on the oldest supported devices before adding more visual layers.
