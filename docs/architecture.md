## Moodly Architecture (Scalability Guardrails)

Goal: keep Moodly “team scalable” while staying Expo-compatible and UI-stable.

### Layers (import rules)

- **`src/screens/*`**: UI screens only.
  - No persistence calls directly.
  - No AsyncStorage imports.
  - Use `src/data/*` APIs and pure selectors from `src/domain/*`.

- **`src/components/*`**: reusable UI components.
  - No persistence calls directly (same rule as screens).

- **`src/data/*`**: persistence + caching + migrations/quarantine.
  - Owns AsyncStorage access and any caching/coalescing.
  - Must validate at boundaries (runtime guards).

- **`src/domain/*`**: pure domain rules + analytics selectors.
  - Deterministic transforms.
  - No side effects, no storage, no React.

- **`src/lib/*`**: pure utilities + platform-safe helpers.
  - Security logging helpers live under `src/lib/security/*`.

### Logging rules (privacy-safe)

- Use `src/lib/security/logger.ts` for internal logs.
- Do not log payloads (entries/notes/settings blobs).
- Console is patched on startup to redact and silence logs in prod.

### Data contract

See `src/data/DATA_CONTRACT.md`.

### Guardrails (enforced)

- **ESLint boundary rules**:
  - UI code (`src/screens`, `src/components`, `src/hooks`) cannot import AsyncStorage.
  - UI code cannot deep-import storage modules (`src/data/storage/*`).
  - UI code cannot call `console.*` (use `logger` instead).

### How to add a feature safely (pattern)

- **UI work**: add/modify a screen under `src/screens/*` and keep it thin (layout + intent only).
- **Domain work**: add pure selectors/rules under `src/domain/*` (deterministic; no side effects).
- **Persistence work**: add/modify data access under `src/data/*` (validation, caching, quarantine).
- **Plumbing**: expose new public functions via the appropriate `index.ts` in `src/data` or `src/domain`.

