## Screens

Full-screen UI: layout, navigation wiring, **`useFocusEffect`** data loads where appropriate.

- Import persistence only from **`src/storage`** (`eslint.config.cjs` blocks **`src/data/**`**).
- Prefer pure helpers from **`src/utils`** (exported from **`src/lib/**`** where noted). Do **not** import **`AsyncStorage`**.
- Respect **safe-area** conventions: tabs leave bottom padding for **`FloatingTabBar`**; modal sheets typically use **`SafeAreaView`** with **`edges`** including **bottom** where the home indicator matters.

### Screen inventory

| Screen | Responsibility |
|---------|----------------|
| **`TodayScreen.tsx`** | Today entry: mood picker, note, save (`useMoodEntry`). |
| **`JournalScreen.tsx`** | Descending timeline; **`FlashList`** default (see `JOURNAL_LIST_IMPL`); edit modal. |
| **`CalendarView.tsx`** | Year pager (**`FlatList`** horizontal paging); opens month timeline. |
| **`CalendarScreen.tsx`** | Month timeline (**Animated FlashList**); day tap modal; **`useTodayKey`**. |
| **`SettingsScreen.tsx`** | Modal: stats, **Appearance** segmented capsule (**LiquidGlass**), calendar style toggle, destructive clear. |

### Hot paths (perf-sensitive)

- `CalendarScreen.tsx` — vertical month list + viewability refs.
- `CalendarView.tsx` — horizontal year pager + memoized **`YearPage`**.
