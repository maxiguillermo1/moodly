## Moodly — App Store readiness checklist (Expo / local‑first)

This document defines the **minimum bar** for “App Store–ready” quality for Moodly while preserving constraints:
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

- **Cold start**: open app → no white flash / no layout jumps
- **Today**: select mood + note + Save → relaunch → persists
- **Journal**: scroll smooth → edit → Save → persists → long-press delete works
- **Calendar**: year scroll smooth → open month → tap day → edit/save works
- **Settings**: stats load, toggles persist
- **Accessibility quick pass**:
  - VoiceOver: tabs + icon buttons announce correctly
  - Dynamic Type up: text remains readable (no major clipping)
  - Reduce Motion on: interactions still feel smooth

---
## Quality gates (must pass)

```bash
npm run lint
npx tsc --noEmit
npm test
```

## References (where the “rules” live)

- Architecture + boundaries: `docs/architecture.md` (enforced by `eslint.config.cjs`)
- Decisions/invariants: `docs/DECISIONS.md`
- Logging contract: `docs/logger.md`
- Security checklist: `SECURITY_CHECKLIST.md`

