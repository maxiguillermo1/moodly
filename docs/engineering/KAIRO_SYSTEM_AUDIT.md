# Kairo System Audit

**Repository:** `/Users/astrofy/Desktop/Kairo`  
**Branch:** `engineering/kairo-full-system-audit`  
**Baseline commit:** `7ac0eaf` (tag: `checkpoint/pre-audit-20260731-124441`)  
**Audit date:** 2026-07-31  
**App version:** 0.6.0 (Expo 54, React Native 0.81.5, JavaScript)

## Executive summary

Kairo is a mature, well-tested local-first mood journal with optional Supabase sync. The codebase has strong persistence testing (374→377 Jest tests), SQLite migration paths, redacted logging, and iOS release gates. This audit identified **2 P0**, **12 P1**, **18 P2**, and **9 P3** issues across security, sync, data integrity, and React lifecycle domains.

**Critical fixes implemented in this branch:**
- SEC-001 / DATA-005: Account switch without sign-out now wipes local data before cloud restore
- DATA-001: Outbox reconciliation after cloud pull prevents stale mood ops from regressing cloud data
- SEC-003: Supabase session storage uses correct `sb-<ref>-auth-token` key
- SEC-007 / DATA-013: All Supabase pull queries now check `.error`
- DATA-008: Corrupt sync outbox is quarantined instead of silently discarded
- DATA-005: Legacy AsyncStorage blobs scrubbed on SQLite wipe
- RN-001 / RN-003 / RN-009: Midnight date rollover fixes for mood and habits

UI/UX preserved: all changes are internal implementation only.

## Repository overview

| Metric | Value |
|--------|-------|
| Meaningful files (excl. node_modules) | 2,874 |
| Source JS/JSX files | 384 |
| Test files | 92 |
| Jest tests | 377 (all passing) |
| ESLint | 0 errors, 6 pre-existing hook warnings |
| expo-doctor | 18/18 |
| npm audit (prod) | 18 advisories (transitive dev tooling; unchanged) |

## Architecture map

```
App.jsx → RootApp → Providers (Theme, Auth) → NavigationContainer → RootNavigator
  ├─ Auth gate (AccountLoginScreen when cloud enabled + signed out)
  └─ MainStack
       ├─ MainTabs: Calendar | Today | Journal
       └─ Stack: Settings, Account, Habits, Goals, Todo

Data: Screen → src/storage façade → src/data/storage → SQLite/AsyncStorage
Cloud: syncBridge → syncOutbox → syncEngine (pull → reconcile → push)
```

## Data-flow map

**Mood write:** `useMoodEntry.save` → `upsertEntry` → moodStorage write lock → SQLite → session cache → syncBridge enqueue

**Cloud sync:** `runSyncCycle` → `pullCloudDataToLocal` (LWW mood merge) → `reconcileOutboxAfterPull` → `pushOutboxToCloud`

**Sign-out:** `signOut` → auth listener + explicit `handleSignedOut` → `clearAllUserData` + outbox clear + cache invalidation

## Authentication flow

1. `AuthProvider` loads settings, checks `localOnlyMode`
2. Supabase `onAuthStateChange` drives session state
3. `SIGNED_IN` → fresh sign-in snapshot OR resume sync
4. Account switch (different user id) → local wipe before restore (**new**)
5. `SIGNED_OUT` → local journal wipe + outbox clear

## Findings by severity

### P0 — Critical (2 found, 2 fixed)

| ID | Issue | Status |
|----|-------|--------|
| SEC-001 | Cross-user data contamination on account switch | **Fixed** |
| DATA-001 | Stale outbox overwrites cloud after pull merge | **Fixed** |

### P1 — High (12 found, 8 fixed, 4 deferred)

| ID | Issue | Status |
|----|-------|--------|
| SEC-002 | Sign-out cleanup failure silently ignored | **Partially fixed** (explicit cleanup in signOutUser) |
| SEC-003 | Wrong SecureStore session key / swallowed removeItem | **Fixed** |
| DATA-002 | Habits/goals pull is full replace (no merge) | Deferred — needs domain merge design |
| DATA-003 | Non-transactional multi-domain cloud pull | Deferred |
| DATA-004 | Cloud push delete-then-insert data loss window | Deferred |
| DATA-005 | Legacy AsyncStorage blobs survive SQLite wipe | **Fixed** |
| DATA-006 | SQLite import marks complete when COUNT>0 | Deferred |
| DATA-007 | Outbox concurrent enqueue race | **Fixed** (write lock) |
| DATA-008 | Corrupt outbox silently discarded | **Fixed** |
| RN-001 | Stale mood after midnight on Today | **Fixed** |
| RN-002 | Calendar save `isSaving` state never set | **Fixed** |
| RN-003 | HabitsScreen frozen `getToday()` | **Fixed** |

### P2 — Medium (18 found, 5 fixed, 13 documented)

Includes: OAuth implicit tokens (SEC-004), unencrypted outbox (SEC-005), cloud pull validation gaps (SEC-006), partial restore errors (SEC-007), log redaction (SEC-008), async auth listener (SEC-009), task shard atomicity (DATA-009), lifecycle races in Goals/Settings/Calendar hooks (RN-004–010).

### P3 — Low (9 found, documented)

Includes: client password policy, RLS assumptions, OAuth script nonce skip, project ref in examples, nested error boundaries, accessibility gaps.

## Security findings

- No hardcoded secrets in tracked source (`npm run check:secrets` passes)
- Auth tokens now use correct Supabase storage key
- Log redaction extended for auth/PII field names
- Remaining: OAuth hash-token fallback path, outbox encryption at rest (defense-in-depth)

## Privacy findings

- Sign-out now scrubs legacy AsyncStorage blobs in addition to SQLite
- Account switch clears prior user's local journal before new user sync
- Journal content in sync outbox remains in AsyncStorage (P2, documented)

## Testing findings

- Strong storage stress and migration test coverage
- Added: `outboxReconcile.test.js` (3 cases)
- Updated: `useMoodEntry.test.js` for auto-load on date change
- Gaps: account-switch integration test, cloud pull partial-failure test

## Dependency findings

- Expo 54 / RN 0.81.5 aligned; expo-doctor clean
- 18 npm audit advisories in transitive deps (mostly dev middleware); no automatic upgrades applied

## Recommended future improvements

1. Per-domain LWW merge for habits/goals on cloud pull
2. Transactional cloud pull applier (all domains or rollback)
3. Replace delete-then-insert cloud push with upsert/diff RPC
4. Nested error boundaries per tab
5. Accessibility: radiogroup semantics on MoodPicker, loading labels on Journal
