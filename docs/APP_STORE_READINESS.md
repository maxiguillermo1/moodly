## Kairo — App Store readiness checklist (Expo / local‑first)

This document defines the **minimum bar** for “App Store–ready” quality for Kairo while preserving constraints:
- No new features / no removed features
- No navigation/flow changes
- No backend/network calls
- AsyncStorage keys/semantics unchanged
- Expo Go compatible

---

## 1) iOS UI polish checklist (no redesign)

### Typography + spacing
- Use the shared type ramp (`src/theme/typography.ts`) consistently.
- Maintain an 8pt-ish rhythm via `spacing` tokens (`src/theme/spacing.ts`).
- Avoid ad-hoc font weights/sizes in screens unless there’s a documented exception.

### Tap targets
- All tappables meet iOS minimum target: **44×44pt**.
- If a control is visually smaller, use `hitSlop` to reach 44pt without changing layout.

### Hairlines + grouped surfaces
- Prefer `StyleSheet.hairlineWidth` with subtle separators.
- Grouped sections should have:
  - inset separators aligned to label baseline
  - subtle “card stroke” on section container

### Sheets/modals
- Use iOS conventions:
  - `presentationStyle="pageSheet"` where already used
  - clear header affordances (Cancel / Save)
  - no layout jumps on open/close

### Motion + micro-interactions
- Press feedback is iOS-like (highlight/scale) and consistent.
- Avoid jank:
  - no white flashes on transitions
  - defer heavy work using `InteractionManager.runAfterInteractions` where appropriate

---

## 2) Accessibility (must-pass)

### VoiceOver metadata
- Icon-only buttons have:
  - `accessibilityRole="button"`
  - `accessibilityLabel`
  - `accessibilityHint` where helpful
- Tabs have labels/hints (VoiceOver should announce which tab and selected state).

### Dynamic Type
- Ensure text in shared components enables scaling (`allowFontScaling`) where sensible.
- Prefer `numberOfLines` + truncation for long note previews in lists.

### Reduce Motion
- Respect “Reduce Motion”:
  - disable nonessential scale/transition animations
  - keep core interactions functional

---

## 3) Performance (60fps target on hot paths)

### Lists / grids
- Stable `renderItem` / `keyExtractor` (memoized) for all virtualized lists.
- Avoid per-cell allocations in calendar hot paths unless memoized.
- Prefer passing **sliced** data to calendar month components (already done via month index).

### Navigation + screen focus loads
- Use `useFocusEffect` only for data loads.
- Defer heavy work until after interactions when it affects transition smoothness.

---

## 4) Reliability (local storage treated as untrusted)

- All AsyncStorage reads are:
  - safe-parsed
  - validated
  - corruption-quarantined (reset to safe defaults)
- Dev should fail fast on invariant violations where safe, but production must recover.

---

## 5) Privacy posture (what we do + what we defer)

### What we do today
- **No backend**; data is local-only.
- **Structured logger** with redaction:
  - metadata-only logs
  - no notes / full entry payloads / settings blobs
- Console is hardened (`installSafeConsole`) to avoid accidental leakage.

### What we intentionally defer (explicitly)
- **Encryption at rest**: not implemented (would require key management decisions and careful UX).
- **Cloud sync / backups**: not implemented.
- **PII classification**: we treat all journal notes as sensitive and avoid logging them entirely.

---

## 6) Release sanity checklist (2–5 minutes)

- **Cold start**: open app → no white flash / no layout jumps (**native splash** respects system light/dark in standalone/dev builds; Expo Go launcher is not a reliable splash reference)
- **Today**: select mood + note + Save → relaunch → persists
- **Journal**: scroll smooth → edit → Save → persists → long-press delete works
- **Calendar**: year scroll smooth → open month → tap day → edit/save works
- **Settings**: stats load; **Appearance** segmented control persists (Auto/Light/Dark); **Theme** toggle (calendar dot vs fill) persists
- **Accessibility quick pass**:
  - VoiceOver: tabs + icon buttons announce correctly
  - Dynamic Type up: text remains readable (no major clipping)
  - Reduce Motion on: interactions still feel smooth

---
## Quality gates (must pass)

```bash
npm run validate:ios-release
npm run validate:release
```

`validate:ios-release` is the fastest iOS submission gate: TypeScript, ESLint, full Jest,
focused storage/persistence stress, Expo Doctor, iOS bundle export, and production audit.
`validate:release` adds Android export coverage.

Production dependency hygiene:

```bash
npm audit --omit=dev --audit-level=moderate
```

This must report `0 vulnerabilities` before submission.

Latest iOS gate:

| Gate | Result |
|---|---|
| `npm run validate:ios-release` | Passed |
| Jest | `30` suites, `130` tests passed |
| Storage stress | `5` suites, `39` tests passed |
| Expo Doctor | `17/17` checks passed |
| iOS export | Passed |
| Production audit | `0 vulnerabilities` |

## Physical-device evidence still required

Automated gates cannot prove frame pacing, haptic feel, keyboard animation, VoiceOver focus order,
or iOS low-memory/background lifecycle behavior. Before App Store submission, complete the device
matrix in [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) on at least one older physical iPhone
and one current physical iPhone using a TestFlight or release-style EAS build.

## Final release blockers (external / account-owned)

- Confirm `com.maxiguillermo.kairo` is owned and reserved in Apple Developer and App Store Connect.
- Run `eas init` / project linking before relying on EAS submit; do not commit guessed project IDs.
- Provide final icon/adaptive icon assets and verify App Store asset requirements.
- Decide whether the current minimal splash asset is acceptable for public launch branding.
- Complete App Store Connect metadata: screenshots, support URL, privacy nutrition labels, age rating,
  copyright, review notes, and export compliance.

`app.config.ts` declares bundle IDs, icons, build numbers, and `usesNonExemptEncryption: false`.
Production EAS profile uses `autoIncrement`; otherwise increment `ios.buildNumber` / `android.versionCode` per submit.
See [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## App Store Connect Answers

Use this as the review packet unless product scope changes:

| App Store field | Kairo answer |
|---|---|
| Data collection | The app does not collect data from this app. Mood/journal/goals/reminders stay on-device. |
| Tracking | No tracking. No ATT prompt. No third-party analytics or advertising SDK. |
| Account requirement | No account required. |
| Network/backend | No backend or network dependency for core use. |
| Encryption/export compliance | Uses only standard platform/transport encryption; `usesNonExemptEncryption` is `false`. |
| Notifications | No OS notifications are scheduled. Reminders are in-app time cues only. |
| Location/camera/microphone/photos/contacts | Not used; no permissions requested. |
| Medical claims | None. Kairo is a journaling/productivity app, not medical advice or diagnosis. |
| Review notes | “Kairo is a local-first mood journal. No login is required. To test: open Today, select a mood, add a note, save, then use Calendar/Journal/Goals/Reminders/Settings from the tab bar. All sample data is user-created; the app has no backend or tracking.” |

## References (where the “rules” live)

| Topic | Doc |
|--------|-----|
| Architecture + boundaries | `docs/architecture.md` (with `eslint.config.cjs`) |
| Design tokens + appearance runtime | `docs/DESIGN_SYSTEM.md` |
| Reusable UI | `docs/COMPONENTS.md` |
| Decisions/invariants | `docs/DECISIONS.md` |
| Logging contract | `docs/logger.md` |
| Security checklist | [`SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md) |
| Testing | `docs/TESTING.md` |
| Web roadmap (chunked) | `docs/WEB_DEPLOYMENT_CHUNKS.md` |
| Performance | `docs/PERFORMANCE.md` |

