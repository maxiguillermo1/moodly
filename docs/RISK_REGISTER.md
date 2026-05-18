# Risk Register

This register tracks known product and platform risks that are accepted for the current local-first foundation or require explicit future investment.

| Risk | Status | Trigger | Mitigation |
|------|--------|---------|------------|
| Full JSON blobs in AsyncStorage | Accepted for current scale | Cold hydration or save latency becomes visible with 10k+ mood/journal rows, import/export, or sync | Move remaining aggregate stores to SQLite or month/id sharded storage. |
| No built-in backup/export | Product risk | App Store launch or user trust review | Design export/import before marketing as durable journaling. Document uninstall/device-loss risk. |
| No encryption-at-rest UX | Deferred | Stronger privacy positioning, regulated use, or cloud sync | Define key management, recovery, deletion, and platform Keychain semantics first. |
| No cloud sync/account system | Deferred | Multi-device requirement | Keep local-first semantics; design conflict resolution and offline merge before backend selection. |
| Physical-device performance evidence | Required before submission | Release candidate | Use `RELEASE_CHECKLIST.md` device matrix on older and current iPhones with TestFlight/release-style builds. |
| Future multi-key migrations | Watch | First shape-changing schema migration | Require idempotent migrations, temp keys/commit markers, and failure-injection tests. |
| Calendar/list scale | Watch | Imported histories, sync, or dense multi-year extension data | Benchmark cold load, scroll, memory, and cache invalidation; sharding/SQLite before scale expansion. |
| Goals/tasks scale growth | Watch | Very long goal histories, import/export, sync, or large completed-history views | Day Reminders are date-sharded and recurrence is bounded; move goal history, recurrence metadata, and completed history to SQLite before large-scale expansion. |
| Recurrence edge cases | Watch | OS notifications, multi-device sync, timezone travel, or generated future instances | Keep recurrence helpers deterministic over local `YYYY-MM-DD` keys; bounded generation persists `lastGeneratedDate`; add failure-injection and device timezone tests before background generation. |
| In-app reminders expectation mismatch | Product risk | Users expect OS-level notifications | Current cues are stored in-app only; require explicit notification permission, scheduling, cancellation, and timezone QA before marketing as alerts. |
| App Store account/assets | External blocker | Public submission | Confirm bundle ownership, EAS project linkage, icons, screenshots, support URL, privacy answers, and review notes. |
| AI/insights privacy | Deferred | Any AI feature proposal | Require explicit opt-in, local-first preference, no note upload by default, explainability, and deletion guarantees. |

## Current Automated Evidence

- `npm run validate:ios-release` includes typecheck, lint, full Jest, storage stress, Expo Doctor, iOS export, and production audit.
- `npm run validate:release` includes typecheck, lint, full Jest, storage stress, Expo Doctor, and native bundle export.
- `npm audit --omit=dev --audit-level=moderate` must report `0 vulnerabilities`.

## Accepted Unknowns

The repo cannot prove true haptic feel, keyboard choreography, low-memory behavior, VoiceOver focus order, or sustained frame pacing without physical devices. Those are release evidence requirements, not optional nice-to-haves.
