## Storage

Local persistence lives here (AsyncStorage, caching, parsing, quarantine).
Screens/components should import storage APIs from `src/storage`.
Do not import UI or navigation into storage.

Note:
- `src/storage/*` is a **facade** for UI.
- Implementation lives in `src/data/storage/*` (validation, quarantine, caches, write locks).
- Persisted **appearance** (`light` / `dark` / `system`) is consumed on boot by **`AppThemeProvider`** (`docs/DESIGN_SYSTEM.md`).

