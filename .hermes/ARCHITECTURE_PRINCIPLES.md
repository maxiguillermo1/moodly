# Architecture Principles — Kairo

Version: 1.0  
Living document — update when core invariants change.  
Complements [ARCHITECTURE.md](../ARCHITECTURE.md) (component map) and [TECHNICAL.md](../TECHNICAL.md) (implementation detail).

---

## Core purpose

Kairo is a **local-first emotional memory app**: a calm mood + journal experience anchored in a **year-scale color timeline**. Optional Supabase cloud sync exists for users who opt in; the app must remain fully useful offline without an account.

---

## Design invariants

These must never be violated without an explicit decision record and migration path.

### 1. Local-first, no silent data loss

User data lives on device by default (SQLite + AsyncStorage). Writes are **persist-first** (RAM caches update only after storage succeeds), **serialized** (no lost concurrent saves), and **validated** (corrupt values are quarantined, not crash-looped).

### 2. Single persistence façade for UI

Screens, components, hooks, and navigation import **`src/storage`** only. They must not import AsyncStorage, `src/data/storage/*`, or deep `src/data/*`. ESLint enforces this.

### 3. Local calendar day identity

Canonical day keys are **local** `YYYY-MM-DD` strings. UTC derivation (`toISOString().slice(0,10)`) is banned. Product semantics are "how was *my* day."

### 4. Emotional timeline is primary

The yearly mood color map is the hero surface. Habits, goals, reminders, and insights are **supporting context** — they must not compete with or reframe Kairo as a productivity dashboard.

### 5. Fail closed on untrusted storage

AsyncStorage and SQLite reads are runtime-validated. Corruption triggers quarantine to a backup key and reset to a safe default. The app must not crash on bad data.

### 6. Privacy-safe observability

UI code never calls `console.*`. Logging goes through `src/security` with redaction. Notes and full entry payloads are never logged.

### 7. Separation of concerns

| Layer | Responsibility |
|-------|----------------|
| `src/features/*/screens/` | User intent and orchestration |
| `src/components/` | Reusable presentation |
| `src/hooks/` | Reusable React wiring |
| `src/utils/`, `src/lib/` | Pure deterministic helpers (no React, no persistence) |
| `src/storage/` | Public persistence API for product code |
| `src/data/repositories/` | Domain-shaped facades |
| `src/data/storage/` | AsyncStorage + SQLite + validation + caches |
| `src/cloud/` | Optional Supabase auth + sync |
| `src/security/` | Logger, redaction, console patch |
| `src/theme/` | Appearance and design tokens |
| `src/navigation/` | React Navigation wiring |

Modules must not leak responsibilities across these boundaries.

### 8. Measured, not estimated

Performance claims in documentation must come from executed measurements. See `docs/PERFORMANCE*.md` and `docs/engineering/PERFORMANCE_BUDGETS.md`.

---

## Data flow principles

```text
User action (screen)
    → src/storage façade (repositories)
    → src/data/storage (validate, serialize write, update cache)
    → SQLite / AsyncStorage on device
    → (optional) src/cloud outbox → Supabase Postgres when configured
```

Read models (Daily Activity, insights bundles, calendar snapshots) are **derived** from canonical stores — not parallel write paths.

---

## Error handling principle

- Errors must be actionable where user-facing
- `AppErrorBoundary` catches subtree failures with retry affordance
- Bootstrap migrations use retry (`runBootstrapWithRetry`) for cold-start resilience
- Storage corruption → quarantine + safe default, never crash loop

---

## Testing principle

- Jest with `TZ=America/Los_Angeles` for date invariants
- Targeted tests for date keys, storage, and calendar math on hot-path changes
- `test:storage-stress` for persistence work
- `validate:release` before native/config changes

---

## ESLint boundary enforcement

Import rules are not advisory — they are enforced in `eslint.config.cjs`:

- UI layers: may import `storage`, `components`, `utils`, `theme`, `types`, `security`
- Pure layers: no React, navigation, or persistence imports
- Storage implementation: no screen/component/navigation imports
- UTC date-key patterns: blocked via `no-restricted-syntax`

Full detail: [docs/architecture.md](../docs/architecture.md) § Import rules.
