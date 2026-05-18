## Safe change checklist (keep under 20 lines)

- If you touched **calendar** (`CalendarScreen`, `CalendarView`, `MonthGrid`): verify year swipe, month open, month scroll, day tap/save feels smooth.
- If you touched **storage** (`src/data/storage/*`): verify corrupted storage recovery still works; caches invalidate on writes; no AsyncStorage in UI.
- If you touched **date logic**: ensure local `YYYY-MM-DD` keys (no `toISOString().slice(...)`), validate with `isValidISODateKey`; display paths use hardened `parseISODate` / `formatDateForDisplay`.
- If you touched **theme / appearance** (`AppThemeContext`, `SettingsScreen`, `LiquidGlass`): verify light vs dark modes, segmented appearance control, Reduce Transparency blur fallback (opaque fill still readable).
- If you touched **Journal lists** (`JournalScreen`): smoke-test tab switch churn (FlashList thaw); optionally flip `JOURNAL_LIST_IMPL` to `'flatlist'` for comparison.
- Always run: `npm run lint`, `npm run typecheck`, and `npm test`; before release also `npm run export:bundles-check` (CI runs this on `main`).

