# Moodly — Mobile production audit (v0.6)

**Date:** 2026-05-19 (updated)  
**Scope:** Production polish, stability, performance, security/privacy, accessibility, QA edge cases, App Store readiness, architecture — **no UI/UX redesign**.  
**Product:** Local-first emotional timeline; no accounts, no cloud sync, no OS push notifications for reminders.

**Verification:**

```bash
npm run validate          # typecheck + lint + 280 tests — PASS
```

---

## 1. Improvements made

### Mobile polish

| Area | Change |
|------|--------|
| Calendar day tap | **`useCalendarDayPress`** on **`CalendarScreen`**: haptics, invalid `YYYY-MM-DD` guard, VoiceOver announce, latest-tap-wins race guard, perf breadcrumbs. |
| Calendar keyboard | Edit modal wrapped in **`KeyboardAvoidingView`** (iOS `padding`) so the note field stays visible while typing. |
| Calendar save | **`isValidLocalCalendarDayKey(selectedDate)`** before **`upsertEntry`** — blocks corrupt modal state from writing. |
| Today @ midnight | **`useFocusEffect`** depends on **`today`** so the tab reloads when **`useTodayKey`** advances while focused. |
| Today cleanup | Save-message timeout cleared on screen unmount (no leaked timers). |
| Settings links | **`Linking.openURL`** first (iOS HTTPS quirk); haptics on legal row tap. |
| **`useMoodEntry`** | Invalidates in-flight loads when **`date`** changes (prevents stale cross-day state). |
| **Refactor pass** | **`applyMoodCalendarSnapshot`**, **`openExternalUrl`**, **`perfDuration*`**; shared **`nextRequestId`** / **`MONTH_NAMES_EN_LONG`**. |

### Performance & perceived responsiveness (prior + maintained)

| Area | Change |
|------|--------|
| **`moodStorage`** | Warm-path cache for upsert/delete; **`getJournalEntriesSortedDescSnapshot()`** for Journal; month index without extra clone when cache warm. |
| **`CalendarScreen`** | **`fetchMoodCalendarSnapshot`**, memoized month rows, layout coalescing (rAF), FlashList **`overrideItemLayout`**, deferred work cancelled on blur, conditional list epoch on today change. Timeline scroll/window logic moved to **`useCalendarMonthTimelineScroll`** (~620 LOC screen). |
| **Journal** | **`src/lib/journal/`** — O(n) section bucketing; **`getJournalEntriesSortedDescSnapshot`** on focus reload. |

### Deployment & store metadata (prior)

| Area | Change |
|------|--------|
| Config | **`app.config.ts`**, **`eas.json`**, production build/submit scripts, **`.env.example`**. |
| Legal / support | Settings → Privacy, Terms, Support (**`Linking`**); version via **`formatReleaseVersionLine()`**; Clear All Data footer. |
| Docs | **`DEPLOYMENT.md`**, **`PRIVACY.md`**, **`TERMS.md`**, **`RELEASE_CHECKLIST.md`** updated. |

### Documentation synced

- **`CHANGELOG.md`**, **`STABILITY_NOTES.md`**, performance/architecture docs (see prior engineering passes).
- This report: **`docs/MOBILE_PRODUCTION_AUDIT.md`**.

---

## 2. Stability issues fixed

| Issue | Mitigation |
|-------|------------|
| Transient cold-start migration failure | **`runBootstrapWithRetry`** (3 attempts, 50–150 ms backoff) in **`bootstrap.ts`**. |
| Fast calendar day taps racing **`getEntry`** | Centralized in **`useCalendarDayPress`** with request-id guard. |
| Invalid calendar day keys opening editor / saving | Guard on tap; validate before save. |
| Today stale after local midnight (tab open) | Focus effect re-runs when **`today`** changes. |
| Leaked save-message timer on Today unmount | **`useEffect`** cleanup. |
| Invalid mood/date upserts vs optimistic UI | **`upsertEntry`** throws on invalid input (storage layer). |
| Garbage navigation day params | **`coerceLocalDayKeyOrToday`** (Reminders), validated hints (Goals). |
| Wide Daily Activity range N+1 reads | Batched **`getTasksForDate`** in range repository. |
| Bootstrap failure allowing writes | **`assertLocalPersistenceWritable`** / disk-ahead-of-app guards. |

---

## 3. Performance optimizations

| Layer | Optimization |
|-------|----------------|
| Storage | Session entry cache; journal sorted snapshot; calendar snapshot coalescing. |
| Calendar UI | FlashList heights, memo rows, scroll/layout coalescing, blur cancellation, InteractionManager for focus load. |
| Journal | O(n) sections vs re-sort; stable section memoization. |
| Startup | Splash held until ready (**`SplashScreen.preventAutoHideAsync`** in **`RootApp`**). |
| Bundle | Release export gate via **`npm run export:bundles-check`** in CI. |

**Honest limits:** Mood entries remain a single **`moodly.entries`** JSON blob — fine for typical journals; very large multi-year datasets may need a future shard/SQLite strategy (product decision).

---

## 4. Security & privacy fixes

| Topic | Posture |
|-------|---------|
| Logging | UI uses **`logger`** only; **`patchConsole`** redacts prod noise; no journal text in logs. |
| Storage | Local AsyncStorage; migrations with backup envelopes; corrupt meta quarantine. |
| Auth / network | No accounts, no API tokens in core app — attack surface is device + backup exposure. |
| Data deletion | **`clearAllUserData()`** wipes moods, habits, goals, and reminders/tasks; Settings uses it (footer, alert, and behavior now aligned). |
| Input validation | Local day keys, mood grades, journal edit date checks. |
| Dependencies | CI runs **`expo-doctor`**; lockfile pinned in repo. |

---

## 5. Accessibility improvements

| Area | Status |
|------|--------|
| Calendar day tap | **`announceForAccessibility`** on selection (hook). |
| Icon controls | Shared patterns in components; tabs labeled in navigator. |
| Dynamic Type | **`maxFontSizeMultiplier`** on key labels (e.g. Today save message). |
| Reduce motion | Reanimated paths respect reduced-motion flags where wired (calendar title collapse). |
| Live regions | Save feedback uses **`accessibilityLiveRegion="polite"`** on Today. |

**Gap:** Systematic audit of every list row / habit chip for hints is not 100% complete — prioritize VoiceOver on Calendar, Journal edit, Settings legal rows in device QA.

---

## 6. Edge cases handled

| Scenario | Behavior |
|----------|----------|
| Airplane mode / offline | Fully local — no network dependency for core flows. |
| App background → foreground past midnight | **`useTodayKey`** resyncs on **`AppState` active**; Calendar list epoch when focused. |
| Rapid calendar day taps | Latest request wins; modal state not overwritten by stale reads. |
| Invalid / corrupt day keys | Tap ignored; save blocked with user alert. |
| Transient storage read on bootstrap | Retries; sustained failure rejects and blocks writes until retry succeeds. |
| Disk schema newer than app | Writes blocked; user must update app (by design). |
| Empty datasets | Empty states in Journal/Calendar/Goals (existing UI). |
| Large datasets | FlashList + snapshots; storage budgets documented in **`PERFORMANCE_BENCHMARKS.md`**. |
| Logout/login | N/A — no auth. |
| Clear all data | **`clearAllUserData`** — entries, habit selections, tracked habits (defaults), goals, task/reminder shards; settings/appearance kept. |

---

## 7. Architecture improvements

| Change | Benefit |
|--------|---------|
| **`src/lib/journal/`** | Pure section/presence logic testable without RN. |
| **`useCalendarDayPress`** | DRY calendar tap + test coverage. |
| **`userDataReset` + `userDataRepository`** | Single production wipe orchestration for store compliance. |
| **`fetchMoodCalendarSnapshot`** | Single calendar read model for screen + year view. |
| **`useCalendarMonthTimelineScroll`** | Bounded month window, viewability extension, layout coalescing — testable hook boundary for the heaviest Calendar scroll path. |
| **`useGoalsFocusLoad`** | Goals list focus reload + perf flush; keeps **GoalsScreen** free of duplicate **`InteractionManager`** wiring. |
| **`CalendarEditModal`** + **`useCalendarEntryEdit`** | Quick-edit sheet UI + save/day-tap state; same pageSheet behavior as before extraction. |
| **`src/storage` facade** | UI never touches raw AsyncStorage (ESLint). |
| **`app.config.ts` + EAS profiles** | Reproducible release variants. |

**Remaining structure debt:** **`CalendarScreen.tsx`** (~480 LOC) — month row render + large-title scroll remain; modal/save extracted to **`CalendarEditModal`** + **`useCalendarEntryEdit`**. **`GoalsScreen.tsx`** (~850 LOC) unchanged in scope.

---

## 8. Remaining weaknesses

| Priority | Item |
|----------|------|
| **P0 (store)** | Replace placeholder **1024×1024** icons; run **`eas init`** + set **`extra.eas.projectId`**. |
| ~~**P0**~~ | ~~Clear All Data incomplete~~ — **fixed** via **`clearAllUserData`**. |
| **P0 (store)** | Host HTTPS privacy/terms URLs if required beyond in-app **`PRIVACY.md`** / **`TERMS.md`**. |
| **P1** | Physical-device TestFlight / Play internal testing per **`RELEASE_CHECKLIST.md`**. |
| **P1** | Full VoiceOver pass on Settings extensions and Goals/Reminders deep screens. |
| **P2** | Monolithic **`moodly.entries`** at 10k+ entries — monitor; plan sharding if users hit limits. |
| ~~**P2**~~ | ~~Extract Calendar hooks~~ — **done:** snapshot, timeline scroll, entry-edit modal/hook; month row render remains in screen. |
| **P2** | Flaky test history: **`useTodayHabitStripModel`** — re-run if CI timeouts appear. |
| **Product** | No OS notification reminders (in-app only) — document in store listing. |

---

## 9. Deployment readiness

| Gate | Status |
|------|--------|
| **`npm run validate`** | Pass (280 tests) |
| **`npm run validate:release`** | Run before store submit (Expo Doctor + bundle export) |
| **`npm run validate:ios-release`** | iOS-specific release checks when cutting iOS build |
| **EAS production profile** | Defined in **`eas.json`**; requires account **`eas init`** |
| **Secrets** | No backend secrets in repo; **`.env.example`** documents variants |
| **Debug tooling** | Dev-only chaos/fault injection; not enabled in production builds |
| **Permissions** | Minimal — no camera/mic/location for core journaling |

**Account-owned before submit:** Apple/Google developer accounts, signing credentials, final metadata/screenshots, support email live.

---

## 10. Markdown / documentation updated

| File | Update |
|------|--------|
| **`docs/MOBILE_PRODUCTION_AUDIT.md`** | This report (new). |
| **`docs/CHANGELOG.md`** | Production polish section (2026-05). |
| **`docs/STABILITY_NOTES.md`** | Bootstrap retry, calendar hook, Today midnight, keyboard. |
| Prior passes | **`DEPLOYMENT.md`**, **`PERFORMANCE_NOTES.md`**, **`AGENTS.md`**, **`README.md`**, **`RELEASE_CHECKLIST.md`**, **`APP_STORE_READINESS.md`**, etc. |

---

## Recommended next steps (engineering)

1. Device QA: Calendar scroll + day sheet keyboard + midnight Today + Clear All Data.  
2. **`npm run validate:release`** on release branch before **`eas build`**.  
3. Final assets + EAS project id.  
4. Device QA: calendar day tap → edit → save → dismiss (keyboard + haptics unchanged).

---

## 12. Recommended future roadmap

| Horizon | Focus |
|---------|--------|
| **Pre-submit** | Final icons, EAS project id, hosted legal URLs, physical-device QA matrix. |
| **v0.7** | Export/import UX, on-device backup semantics, insights surfaces (repository already exists). |
| **Scale** | Shard or migrate **`moodly.entries`** if profiling shows pressure at 5k+ entries. |
| **Maintainability** | Optional: extract **`renderMonthItem`** from **`CalendarScreen`** (~475 LOC). |
| **Optional** | SQLite behind same repository façades; multi-device sync only post-v1.0. |

---

*Moodly v0.6 — local-first emotional timeline. This audit is a point-in-time snapshot; re-run gates after material changes.*
