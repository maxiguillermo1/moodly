# Stability & edge-case hardening (notes)

Companion to **storage corruption** docs (`src/data/DATA_CONTRACT.md`) and **performance** notes (`docs/PERFORMANCE_NOTES.md`).

## Recent reliability changes

### Persistence bootstrap retry (2026-05)

- **`ensureLocalPersistenceReady`** runs migrations through **`runBootstrapWithRetry`** (3 attempts, short backoff) so a single transient AsyncStorage read failure on cold start does not brick the session.
- Tests: `persistence.test.ts` — transient key failure succeeds; sustained `getItem` failure rejects after retries.

### Calendar day tap (shared hook)

- **`CalendarScreen`** uses **`useCalendarDayPress`** (invalid key guard, haptics, latest-tap-wins, VoiceOver announce, perf breadcrumbs).
- Modal save validates **`selectedDate`** with **`isValidLocalCalendarDayKey`** before **`upsertEntry`**.
- Calendar edit sheet wraps fields in **`KeyboardAvoidingView`** (iOS padding) — note field no longer hidden behind keyboard.

### Today across local midnight

- **`useFocusEffect`** on **Today** includes **`today`** in deps so an open tab reloads the entry when **`useTodayKey`** advances at midnight.
- **`useMoodEntry`** bumps load request id when **`date`** changes so a slow read cannot repopulate the wrong day.

### Clear All Data (store compliance)

- **`clearAllUserData`** (`src/data/storage/userDataReset.ts`) wipes mood entries, habit selections, tracked habits (defaults), goals, and tasks/reminder shards. **Settings** appearance prefs are preserved.
- Test: `userDataReset.test.ts`.

### Single source for local calendar-day validity

- **`isValidLocalCalendarDayKey`** (`src/lib/utils/date.ts`) — `YYYY-MM-DD` strings that are real calendar dates (leap years, month lengths), via shared `parseISODate`.
- **`isValidISODateKey`** in `src/data/model/entry.ts` delegates to that helper so storage and UI agree.

### Calendar day tap

- **`useCalendarDayPress`** ignores taps with invalid date keys (logs + early return) so the modal never opens on impossible days and **async work cannot race** with a bad key.

### Mood upsert

- **`upsertEntry`** **throws** on invalid date or mood (prod and dev) so callers cannot assume persistence succeeded when validation fails; avoids **optimistic local state** updating while disk stayed unchanged.

### Navigation day params

- **`TodoScreen`** uses **`coerceLocalDayKeyOrToday`** so garbage `route.params.date` falls back to **today** (safe default) instead of hitting storage with invalid keys.
- **`GoalsScreen`** shows the “Opened for …” hint only when the param is a **valid** day key.

### Journal edit

- **`handleSaveEdit`** validates **`editingEntry.date`** before save and shows a generic error if corrupt.

### Calendar modal save

- Validates **`selectedDate`** before **`createEntry` / `upsertEntry`**.

### Daily Activity range reads

- **`getDayActivityRange`** batches **`getTasksForDate`** (day Reminder shards) so a **wide local date range** cannot fire unbounded parallel AsyncStorage reads. Ordering stays aligned with the enumerated date list (regression: `dailyActivityRepository.test.ts`).

## Tests

- `src/lib/utils/date.test.ts` — validity + coercion.
- `src/lib/calendar/timeline/routeParams.test.ts` — anchor + initial selection keys.
- `src/lib/utils/latestOnly.test.ts` — rapid-tap request semantics.
- `src/data/storage/moodStorage.test.ts` — upsert rejects invalid date/mood without writing.
- `src/data/repositories/dailyActivityRepository.test.ts` — composed read model, range truncation, **wide-range reminder batching alignment**.

## Verification

```bash
npm run lint && npm run typecheck && npm test && npm run export:bundles-check
```
