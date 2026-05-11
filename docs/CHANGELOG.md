# Changelog

## 2.0.0 — Moodly V2 · 2026-05-11

### Product / UI

- Unified **mood + note** editing via **`MoodEntryFields`**: same **MOOD / NOTE** labels, compact grade control, note field styling, and placeholder (**“Add a short note…”**) on **Today**, **Calendar** day sheet, and **Journal** editor.
- **Floating tab bar**: wider glass capsule, improved horizontal spacing, **larger active tab icon**, refined inactive/active indicator.
- **Today** card: calendar-aligned **Save** (system blue), shared typography with calendar sheet header; **Settings** uses **glass capsule** gear (default `ScreenHeader` behavior).
- **Settings → About**: version reads from **`APP_RELEASE_VERSION`** (kept in sync with `app.json` / `package.json`).

### Engineering

- New **`src/constants/`** for release metadata (`APP_RELEASE_VERSION`, display name, codename).
- Removed duplicate modal field styles from **`CalendarScreen`** where superseded by **`MoodEntryFields`**.
- **`package.json`**: added **`npm run typecheck`** (`tsc --noEmit`).
- **GitHub Actions**: `.github/workflows/ci.yml` runs **lint**, **typecheck**, **tests** (with `TZ=America/Los_Angeles`), and **`expo-doctor`** on pushes/PRs to **`main`**.

### Security & performance (verified in this pass)

- **Demo seed** remains **dev-only** (`seedDemoEntriesIfEmpty` returns immediately when `!__DEV__`).
- **Console** remains patched at entry via **`installSafeConsole`** (redacted args; production silencing per `patchConsole.ts`).
- **Logger** contract unchanged: metadata-only structured logs; no journal text in logs.
- No new network surfaces or secrets introduced; **no required `.env`** for this app.

### Documentation

- **README**, **CHANGELOG**, **DESIGN_SYSTEM**, **PROJECT_STRUCTURE** updated for V2.

---

## Earlier

- **Mood grade color style (Solid ↔ Gradient)** — Persisted **`moodGradeColorStyle`**. **Gradient** uses per-grade **`mood` + `moodGradientMid`** and shared **`moodBloomAccent` (`#FFB7E5`)** at **0% / 70% / 100%** on a **135° TL→BR** `LinearGradient`. **Solid** uses **`mood`** only. Applies across calendar, **`MoodPicker`**, badges, journal rows, etc.
