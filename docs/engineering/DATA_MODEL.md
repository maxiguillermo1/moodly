# Kairo Data Model

Summary of persisted data for the iOS production hardening pass. See also `docs/DATA_ARCHITECTURE.md` and `docs/DATA_SAFETY.md` for full detail.

## Storage technologies

| Layer | Technology | Purpose |
|-------|------------|---------|
| Primary local DB | expo-sqlite | Mood entries, journal, habits, goals, todos |
| Settings | AsyncStorage + SQLite | App preferences, theme, local-only mode |
| Secrets / session | expo-secure-store | Auth tokens (when cloud enabled) |
| Session RAM | In-memory warm cache | Fast Today/Calendar reads after `primeAppStorage()` |

## Schema versioning

- SQLite migrations in `src/data/persistence/` with explicit version numbers
- Every migration: forward-only, idempotent where possible, tested with fixtures
- Malformed rows: quarantine or safe default — **never silently discard user mood/journal text**

## Sensitive data

| Data | Sensitivity | Protection |
|------|-------------|------------|
| Mood notes | High (personal) | Local SQLite; cloud sync when authenticated |
| Journal entries | High | Local SQLite; cloud sync when authenticated |
| Auth tokens | Critical | SecureStore only |
| Settings | Low | AsyncStorage |

## Read / write paths

- **Cold start:** `primeAppStorage()` → migrations → `warmSessionStore()` (non-blocking for UI shell)
- **Today save:** mood repository → SQLite → optional sync queue
- **Journal:** list load on focus; writes debounced/coalesced per screen logic
- **Calendar:** windowed date range; extend on scroll

## Offline behavior

Core workflows work without network: open app, view entries, navigate, create/edit locally, save, relaunch with data intact. Cloud sync queues when configured; does not block local UI.

## Startup invariant

First usable screen must not wait for: network, analytics, error uploads, non-visible tab data, full-history load, cache pruning, or update checks.
