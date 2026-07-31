# Kairo Architecture

## For everyone (plain English)

Kairo is a private mood journal on your phone. You pick a mood grade (A through F), write notes, track habits, set goals, and manage to-dos — all stored on your device first so it works offline. If you sign in with Apple or email, your data can sync to a secure cloud backup (Supabase), but the app never requires the internet for daily use.

The app has three main tabs — **Today** (quick mood entry), **Calendar** (browse and edit past days), and **Journal** (list view). Settings, habits, goals, and to-dos live in additional screens you open from Today or Settings.

## For engineers (technical detail)

### Boot sequence

1. `expo/AppEntry.js` → `src/App.jsx`
2. `installSafeConsole()` — redacted logging
3. `RootApp` — `primeAppStorageCritical()`, splash coordination
4. Provider stack: GestureHandler → SafeArea → AppTheme → Auth → ErrorBoundary
5. `NavigationContainer` → `RootNavigator`
6. Deferred `warmAppStorageSession()` after first paint

### Navigation tree

```
RootNavigator
├── [cloud + signed out] AccountLoginScreen
├── [cloud + restoring] Loading gate
└── MainStackNavigator
    ├── Main (Tab.Navigator, lazy tabs)
    │   ├── Calendar → CalendarStack
    │   ├── Today → TodayScreen
    │   └── Journal → JournalScreen
    ├── Settings (modal)
    ├── Account (card)
    ├── Habits (card)
    ├── Goals (card)
    └── Todo (card)
```

### State ownership

| Concern | Owner |
|---------|-------|
| Route state | React Navigation |
| Theme / a11y | `AppThemeContext` |
| Auth session | `AuthContext` + Supabase |
| Today date key | `useTodayKey()` (midnight timer + AppState) |
| Mood entries | moodStorage session cache + SQLite |
| Sync outbox | `syncOutbox.js` (AsyncStorage) |
| Settings | settingsStorage |

No Redux/Zustand — data hooks load on focus via `InteractionManager`.

### Persistence layers

1. **SQLite** (`kairo.db`) — authoritative for moods, habits, goals after migration
2. **AsyncStorage** (`kairo.*`) — settings, task day shards, sync outbox, legacy import blobs
3. **SecureStore** — Supabase auth session (`sb-<project-ref>-auth-token`)

### Cloud sync protocol

```
runSyncCycle:
  1. pullCloudDataToLocal (parallel Supabase queries)
  2. mergeMoodEntries (LWW by updatedAt)
  3. apply domains via cloudPullApplier
  4. reconcileOutboxAfterPull (drop stale mood ops)  ← new
  5. pushOutboxToCloud (coalesced ops)
```

### Module boundaries

- `src/storage/` — public API for UI (import here, not data/storage directly)
- `src/data/storage/` — persistence implementation
- `src/data/repositories/` — read models (insights, daily activity)
- `src/cloud/` — Supabase auth + sync engine
- `src/features/` — screen modules (product areas)

### Key invariants

- Date keys are local calendar `YYYY-MM-DD`, never UTC `toISOString().slice(0,10)`
- Writes are persist-first; session cache updated after disk commit
- Cloud pull blocked from enqueueing during `isCloudPullActive()`
- Sign-out and account switch must wipe all user domains + outbox
