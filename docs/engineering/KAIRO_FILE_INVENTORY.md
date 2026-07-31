# Kairo File Inventory

**Generated:** 2026-07-31  
**Machine-readable:** `KAIRO_FILE_INVENTORY.json` (2,874 entries)

## Summary by category

| Category | Count | Risk | Notes |
|----------|-------|------|-------|
| `src/features/` screens & components | ~120 | Medium | UI layer — audited for lifecycle bugs |
| `src/data/storage/` | ~45 | High | Core persistence — SQLite + AsyncStorage |
| `src/data/persistence/` | ~35 | High | Migrations, SQLite schema |
| `src/cloud/` | ~30 | High | Auth, sync, Supabase client |
| `src/hooks/` | ~40 | Medium | Data loading patterns |
| `src/components/` | ~50 | Low | Shared UI primitives |
| `src/lib/` | ~60 | Low | Pure helpers, security, calendar math |
| `*.test.js` | 92 | — | Test coverage |
| `docs/` | 47+ | Low | Documentation |
| `scripts/` | ~15 | Medium | Build, migration, verify tools |
| `supabase/migrations/` | 1 | High | RLS policies, schema |
| `.agents/skills/` | ~2000+ | Low | Agent reference material (not app runtime) |

## High-risk files reviewed

| Path | Purpose | Findings | Action |
|------|---------|----------|--------|
| `src/cloud/auth/AuthContext.jsx` | Auth state machine | SEC-001 account switch | **Fixed** |
| `src/cloud/sync/syncEngine.js` | Pull/push orchestration | DATA-001 stale outbox | **Fixed** |
| `src/cloud/sync/syncOutbox.js` | Durable sync queue | DATA-007 race, DATA-008 corrupt discard | **Fixed** |
| `src/cloud/sync/cloudPull.js` | Cloud → local apply | SEC-007 partial errors | **Fixed** |
| `src/cloud/supabase/sessionStorage.js` | Token storage | SEC-003 wrong key | **Fixed** |
| `src/data/storage/moodEntriesBackend.js` | Mood persistence | DATA-005 legacy blob leak | **Fixed** |
| `src/hooks/useMoodEntry.js` | Today mood state | RN-001 midnight bug | **Fixed** |
| `src/features/habits/screens/HabitsScreen.jsx` | Habit toggles | RN-003 frozen date | **Fixed** |
| `src/cloud/sync/cloudPush.js` | Cloud writes | DATA-004 delete-then-insert | Documented |
| `src/data/sync/cloudPullApplier.js` | Pull apply | DATA-002 no habit/goal merge | Documented |

## Intentionally unchanged

- All screen layouts, styles, colors, typography, navigation structure
- `package.json` dependencies (no version bumps)
- Supabase migration SQL
- Asset files, fonts, images
- CI workflow structure

See `KAIRO_FILE_INVENTORY.json` for the complete per-file listing.
