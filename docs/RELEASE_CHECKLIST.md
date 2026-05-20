# Kairo Release Checklist

**Product maturity:** Kairo is **v0.6** (intentionally pre-1.0). This checklist defines **release-candidate** quality; reaching it is a step toward **v1.0** “public-ready,” not a claim that the product line is finished ecosystem software. See [`CHANGELOG.md`](./CHANGELOG.md) § Versioning.

**Pre-1.0 production simulation:** Treat physical-device QA as if the build were going to **tens of thousands** of installs: long sessions, rapid tab and sheet churn, **large local histories** (journal scroll, calendar year/month), Reminder-heavy days, and **background during saves**. Pair dev-only **`perf.report`** / **`perf.longTask`** (when supported) with the manual matrix below. Engineering assumptions for storage concurrency and read-model batching are documented in [`STABILITY_NOTES.md`](./STABILITY_NOTES.md) and [`PERFORMANCE_NOTES.md`](./PERFORMANCE_NOTES.md).

Canonical pre-submission gate for App Store and production builds. Pair with
[`APP_STORE_READINESS.md`](./APP_STORE_READINESS.md), [`DATA_SAFETY.md`](./DATA_SAFETY.md),
and [`PERFORMANCE_NOTES.md`](./PERFORMANCE_NOTES.md).

## Automated Gates

Run from the repo root before every release candidate:

```bash
npm run validate:ios-release
npm run validate:release
```

For a quick iOS submission candidate, `validate:ios-release` must pass without TypeScript, lint,
Jest, focused storage-stress, Expo Doctor, iOS export, or production audit errors. Run
`validate:release` when you want the broader all-platform release gate.

Latest foundation-hardening run:

| Gate | Result |
|------|--------|
| `npm run validate:ios-release` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | Run in CI; see Jest summary (includes a11y-focused component tests). |
| `npm run test:storage-stress` | Passed (`5` suites, `39` tests) |
| `npm run doctor` | Passed (`17/17 checks`) |
| `npm run export:ios-check` | Passed |
| `npm audit --omit=dev --audit-level=moderate` | Passed (`0 vulnerabilities`) |

`npm run validate:release` includes the focused storage-stress suite; run `npm run test:storage-stress`
by itself only when iterating on persistence changes.

## App Store Blockers To Resolve Outside Code

- Confirm Apple Developer ownership of `com.maxiguillermo.kairo`.
- Link the Expo/EAS project and fill `extra.eas.projectId` in `app.config.ts` only after `eas init` (see [`DEPLOYMENT.md`](./DEPLOYMENT.md)).
- Provide final 1024×1024 App Store icon, in-app icon, and adaptive icon assets; current placeholder splash is not a launch-quality App Store icon.
- Decide whether the intentionally minimal splash asset remains acceptable for launch branding.
- Prepare App Store screenshots, support URL, privacy answers, age rating, copyright, review notes,
  and encryption/export-compliance confirmation.
- Upload through EAS/TestFlight, then complete at least one release-style physical-device smoke pass before pressing “Submit for Review.”

## Device QA Matrix

Record every device run with device model, OS version, build type, date, tester, and pass/fail notes. Simulator results are useful for workflow checks but do not replace at least one older physical iPhone and one current physical iPhone.

### Required physical-device evidence before App Store submission

These are the only release risks that cannot be completed inside CI or a headless coding environment because they require real device frame pacing, memory pressure, haptics, keyboard animation, VoiceOver focus, and OS lifecycle behavior:

| Evidence | Minimum bar |
|----------|-------------|
| Older iPhone | One physical device near the oldest supported OS/device class. |
| Current iPhone | One modern physical device on the current iOS release. |
| Build type | TestFlight or release-style EAS build, not Expo Go only. |
| Runtime length | At least 30 minutes active use with tab switches, modal cycles, background/foreground, and calendar scrolling. |
| Accessibility | VoiceOver, Dynamic Type, Reduce Motion, dark/light/system appearance. |
| Data scale | Multi-year mood/journal history plus dense Reminders/Habits/Goals data. |

- Cold launch on a small iPhone and a modern large iPhone.
- Today: select mood, enter note, save, kill/relaunch, verify persistence.
- Today across midnight: leave app open, foreground after local midnight, verify the day changes safely.
- Calendar: year paging, open month, select day, edit/save, verify date/mood mapping.
- Calendar restoration: navigate from year view into several months/days repeatedly; selected day and visible month stay aligned. Repeat with a direct `date` param and with a far-future/far-past route year.
- Calendar date edges: verify Feb 29 on leap years, DST transition weekends, year boundary, and local midnight rollover.
- Journal: scroll long history, edit entry, long-press delete, verify no stale rows.
- Extensions: toggle Habits/Goals/Reminders off and back on; saved per-day data remains.
- Extensions under stress: rapidly toggle extension settings, hide/show tracked habits, add/reorder/complete reminders, and reopen Today/Calendar/Journal hosts.
- Settings: appearance/theme switches persist and do not clobber each other under rapid taps.
- Accessibility: VoiceOver, Dynamic Type, Reduce Motion, modal dismissal, and keyboard coverage.
- Dark/light/system appearance.
- Long session: leave app active through multiple tab switches, modal open/close cycles, background/foreground transitions, and a local day rollover.
- Lifecycle cleanup: save on Today, leave before the confirmation disappears, then return; no stale confirmation or set-state warnings should appear.
- Large data: validate smooth Calendar and Journal behavior with multi-year mood/journal history and dense per-day extension data.

## Low-Memory And Rollback Triage

- If the OS kills the app in background, relaunch must restore persisted mood, journal, settings, and extension data.
- If a release shows storage bootstrap failures, malformed-data loops, or newer-schema warnings, halt rollout and verify the app is not writing to affected keys.
- If users report missing data, inspect only metadata-safe logs; never request raw note content unless the user explicitly exports it.
- If bundle/runtime regressions appear, ship a no-schema-downgrade hotfix first. Do not lower `CURRENT_SCHEMA_VERSION` or overwrite future-schema payloads.
- Rollback decisions should prefer preserving local data over restoring a visual or performance optimization.

## Production Safety

- No backend/network dependency is required for core use.
- Local data stores are schema-versioned, safe-parsed, and recover from malformed payloads.
- Writes are blocked if local persistence bootstrap fails or the on-disk schema is newer than this app.
- Settings and entry read APIs return defensive copies so session caches cannot be mutated by callers.
- Extension visibility toggles and tracked-habit visibility preserve per-day extension values.
- Production logging allows only rate-limited WARN/ERROR metadata; user text, date keys, storage keys,
  record ids, and error stacks/messages are redacted.
- Debug harnesses and demo seed are gated to development paths and are not user-visible.

