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

