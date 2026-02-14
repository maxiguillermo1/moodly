## Safe change checklist (keep under 20 lines)

- If you touched **calendar** (`CalendarScreen`, `CalendarView`, `MonthGrid`): verify year swipe, month open, month scroll, day tap/save feels smooth.
- If you touched **storage** (`src/data/storage/*`): verify corrupted storage recovery still works; caches invalidate on writes; no AsyncStorage in UI.
- If you touched **date logic**: ensure local `YYYY-MM-DD` keys (no `toISOString().slice(...)`), validate with `isValidISODateKey`.
- If you touched **domain selectors**: keep them pure (no React/storage); add/update notes in `docs/DECISIONS.md` if assumptions changed.
- Always run: `npm run lint`, `npx tsc --noEmit`, and `npm test`.

