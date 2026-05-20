# Kairo — cloud backup design

**Status:** **Implemented** — live Supabase Postgres sync with RLS (see [`SUPABASE.md`](./SUPABASE.md)).

## Principles

1. **Cloud Postgres is source of truth** when signed in; local SQLite/AsyncStorage is cache + outbox.
2. **Auth optional for dev** — without Supabase env, app stays local-only.
3. **Explicit account UX** — Settings → Account; Sign in with Apple / Google / email.
4. **Privacy** — RLS isolates journal data per user; logout clears local cache only.

## Architecture (implemented)

| Component | Choice |
|-----------|--------|
| Auth | Supabase Auth + SecureStore session |
| Database | Supabase Postgres mirrors local domains |
| Sync | Outbox push + pull merge (LWW on `updated_at_ms`) |
| Offline | Local cache + retry queue |

## Recovery scenarios

| Scenario | Behavior |
|----------|----------|
| App deleted / reinstall | Sign in → cloud pull restores journal |
| New phone | Sign in → full restore |
| Logout | Local cache cleared; cloud preserved |
| Network loss | Local writes queued; sync retries |
| Account delete | RPC cascade delete all user rows |

## Preconditions

- [x] User-facing export/import (Settings)
- [x] Cloud sync + auth (`AccountScreen`, sync engine)
- [ ] `clearAllUserData` mirrored for cloud-only wipe (use Delete account)
- [ ] Privacy policy + App Store answers updated for cloud storage
- [x] Core reflection works offline with local cache when signed in

## Product decision (updated)

**v1.x:** **Supabase Auth + Postgres sync** for signed-in users. Local cache for performance/offline.

**Future:** Media attachments (Storage bucket + metadata table), realtime subscriptions if needed.

See [`SUPABASE.md`](./SUPABASE.md), [`PRIVACY.md`](./PRIVACY.md), [`DEPLOYMENT.md`](./DEPLOYMENT.md).
