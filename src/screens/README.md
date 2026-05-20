## Screens

Full-screen UI: layout, navigation wiring, **`useFocusEffect`** data loads where appropriate.

**Canonical implementations** live under **`src/features/<area>/screens/`**. This folder keeps **`index.ts`**, a small **public barrel** so navigators can `import { TodayScreen, … } from '../screens'` without deep paths.

- Import persistence only from **`src/storage`** (`eslint.config.cjs` blocks **`src/data/**`** and **`@/data/**`** from UI).
- **Calendar** screens load indexed entries + settings via **`useMoodCalendarSnapshotLoad`** → **`fetchMoodCalendarSnapshot`** (parallel, inflight-coalesced read). **Month timeline** (`CalendarScreen`) uses memoized **`CalendarTimelineMonth`** rows, coalesced card layout measurement, and per-month FlashList heights. Other screens use focused helpers (`getEntry`, `useMoodEntry`, **`getJournalEntriesSortedDescSnapshot`**, etc.).
- Prefer pure helpers from **`src/utils`** (exported from **`src/lib/**`** where noted). Do **not** import **`AsyncStorage`**.
- Respect **safe-area** conventions: tabs leave bottom padding for **`FloatingTabBar`**; modal sheets typically use **`SafeAreaView`** with **`edges`** including **bottom** where the home indicator matters.

### Screen inventory (feature paths)

| Screen | Responsibility |
|---------|----------------|
| **`today/screens/TodayScreen.tsx`** | Today entry: mood picker, note, save (`useMoodEntry`). |
| **`journal/screens/JournalScreen.tsx`** | Descending timeline; **`FlashList`** default (see `JOURNAL_LIST_IMPL`); edit modal. |
| **`calendar/screens/CalendarView.tsx`** | Year pager (**`FlatList`** horizontal paging); opens month timeline. |
| **`calendar/screens/CalendarScreen.tsx`** | Month timeline (**Animated FlashList**, **`CalendarTimelineMonth`** rows); **`useMoodCalendarSnapshotLoad`** on focus; day tap modal; **`useTodayKey`**. |
| **`settings/screens/SettingsScreen.tsx`** | Modal: stats, **Appearance** segmented capsule (**LiquidGlass**), calendar style toggle, **Extensions** (Habits, Goals, **Reminders**), destructive clear. |
| **`reminders/screens/TodoScreen.tsx`** | **Reminders** for one **`YYYY-MM-DD`**: `useDayTodos`, swipe/delete, drag reorder (**`react-native-draggable-flatlist`**), time presets (**`TodoReminderPicker`**). |
| **`habits/screens/HabitsScreen.tsx`** / **`goals/screens/GoalsScreen.tsx`** | Full-screen flows opened from Settings or extension rows (pass **`date`** when coming from a day host). |

### Hot paths (perf-sensitive)

- `CalendarScreen.tsx` — vertical month list + viewability refs.
- `CalendarView.tsx` — horizontal year pager + memoized **`YearPage`**.
