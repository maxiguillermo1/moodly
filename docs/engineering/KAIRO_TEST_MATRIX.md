# Kairo Test Matrix

**Baseline:** 377 tests, 92 suites — all passing after audit fixes  
**Date:** 2026-07-31

| Feature | Test type | Test case | Platform | Expected | Actual | Pass | Evidence |
|---------|-----------|-----------|----------|----------|--------|------|----------|
| Mood entry CRUD | Unit | moodStorage upsert/get/delete | Jest | Valid entries persist | Pass | ✅ | `moodStorage.test.js` |
| Mood midnight rollover | Unit | useMoodEntry reloads on date change | Jest | New date loads fresh entry | Pass | ✅ | `useMoodEntry.test.js` |
| Outbox reconcile | Unit | Stale mood upsert dropped after pull | Jest | Outbox empty when local newer | Pass | ✅ | `outboxReconcile.test.js` |
| Outbox coalescing | Unit | Same-date mood ops coalesce | Jest | Latest op kept | Pass | ✅ | `syncOutbox.test.js` |
| Sync retry | Unit | Partial push schedules retry | Jest | Retry at 15s | Pass | ✅ | `syncEngine.test.js` |
| SQLite migrations | Unit | v0→v4 schema steps | Jest | Tables created | Pass | ✅ | `moodEntriesSqlite.test.js` |
| Storage stress | Integration | Concurrent writes | Jest | No corruption | Pass | ✅ | `npm run test:storage-stress` |
| Auth session storage | Unit | SecureStore read/write failures logged | Jest | Graceful degradation | Pass | ✅ | `sessionStorage.test.js` |
| Fresh sign-in flow | Unit | Snapshot enqueue on sign-in | Jest | Outbox populated | Pass | ✅ | `freshSignInFlow.test.js` |
| Account switch wipe | Integration | User A → User B without sign-out | — | Local wipe before restore | **Gap** | ❌ | Manual / future test needed |
| Cloud pull all errors | Unit | All query errors throw | Jest | Partial — error checks added | Partial | ⚠️ | Code review; no dedicated test |
| iOS bundle | Build | expo export ios | CLI | Bundle succeeds | Not re-run | — | Baseline green at 7ac0eaf |
| Simulator smoke | Manual | Today/Calendar/Journal flows | iOS Sim | No regression | Not run | — | Recommend `npm run start:ios` |
| Visual regression | Manual | Screen layouts unchanged | iOS Sim | Pixel-identical | Not run | — | No UI code changed |

## Remaining gaps

1. Account-switch integration test (SEC-001)
2. Cloud pull partial-failure rollback test (DATA-003)
3. Habits/goals LWW merge tests (DATA-002)
4. End-to-end offline → online sync scenario test
5. Visual regression baseline capture (Phase 9 — not executed this session)
