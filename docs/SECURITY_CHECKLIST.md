# Security & privacy checklist (App Store‑friendly)

Kairo is a local‑first journaling app. User notes can be sensitive. This checklist exists to keep the privacy posture simple, provable, and reviewable.

## What we promise (current posture)

- **No backend / no network calls** for user data.
- **Local storage only** (AsyncStorage).
- **No sensitive logging**: notes and full entry/settings payloads are never logged.
- **Production logs are minimal**: PERF/DEV/CACHE/DATA logs are dev‑only; prod keeps WARN/ERROR metadata only.

## PR reviewer checklist (must pass)

- [ ] **No new network calls** without explicit review (what is sent, where, and why).
- [ ] **No sensitive logs**:
  - UI code never calls `console.*`
  - logs are metadata only (counts/timings/keys), never note text or payload blobs
- [ ] **Storage boundary respected**:
  - UI does not import AsyncStorage
  - UI imports persistence APIs from `src/storage` only
- [ ] **Storage reads are untrusted**:
  - safe parse + validation
  - corruption → **quarantine** to `kairo.<key>.corrupt.<timestamp>` and reset primary key
  - app must not crash‑loop
- [ ] **Storage writes are safe**:
  - date keys validated (`YYYY-MM-DD`, local‑day)
  - mood grade validated
  - note normalized/clamped at the data boundary
  - **persist‑first**: RAM caches update only after AsyncStorage succeeds
  - **writes serialized** (no lost updates on concurrent saves)
- [ ] **Demo seed is dev‑only** and never runs in production by default.
- [ ] **Dependencies**:
  - avoid heavy/opaque packages
  - prefer Expo Go compatible libs
  - review changelog/risk for any new dependency
  - run `npm audit` before release; **residual findings** in Expo’s toolchain may require upstream upgrades (avoid `npm audit fix --force` without a full QA pass)

### Release hygiene (v0.5 phase, 2026)

- **`npm audit fix`** (non–breaking) was applied during the foundation-hardening passes; some **moderate/low** advisories may remain tied to **Expo SDK / Metro / jest-expo** until those packages publish patched trees.
- **Version surfaces**: `app.json` → `expo.version`, `package.json` → `version`, **`scheme`**, **`ios.bundleIdentifier`**, **`android.package`**, and `APP_RELEASE_VERSION` in `src/constants/app.ts` should match or be intentionally updated before tagging a build (replace **`com.maxiguillermo.kairo`** if your Apple / Play registration uses another id).

- **ESLint guardrails**: `eslint.config.cjs`
  - bans AsyncStorage in UI code
  - bans deep `data/storage/*` imports in UI (must use `src/storage`)
  - bans UTC date key derivation (`toISOString().slice(...)`)
  - bans `console.*` in UI code
- **Logger contract**: `docs/logger.md`
- **Data contract**: `src/data/DATA_CONTRACT.md`

