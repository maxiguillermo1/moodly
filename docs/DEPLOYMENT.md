# Kairo — production deployment guide

Deploy Kairo as a **standalone** iOS / Android app via **EAS Build**. Core journaling is **local-first** (no backend, no required `.env`).

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| [Node.js](https://nodejs.org/) LTS | Matches CI (Node 20) |
| [Expo Go](https://expo.dev/go) on device | Must support **SDK 54** (update from the App Store if QR scan fails) |
| [Expo account](https://expo.dev) | For EAS |
| [EAS CLI](https://docs.expo.dev/build/setup/) | `npm install -g eas-cli` |
| Apple Developer Program | For App Store / TestFlight (`com.maxiguillermo.kairo`) |
| Google Play Console | For Play Store (`com.maxiguillermo.kairo`) |

### Expo Go (local dev)

Kairo uses **classic** `App.tsx` entry (`expo/AppEntry.js`), **not** Expo Router. Bootstrap lives in **`src/bootstrap/`** (do not recreate a `src/app/` folder — Expo CLI will treat it as Expo Router and Expo Go will fail to open the project).

```bash
npm start
# or open iOS simulator directly:
npm run start:ios
```

- **Project path must not contain spaces** (e.g. avoid `Desktop/mobile applications/kairo`). Expo Go on a phone hangs or errors otherwise. Fix: `npm run fix:dev-path` (moves to `~/Desktop/kairo`) then `npm run start:clear`.
- Prefer **LAN** (same Wi‑Fi as your Mac). Avoid **Tunnel** unless LAN fails.
- After **moving or renaming** the project folder, clear Metro’s transform cache: `npm run start:clear` (or `npm run start:ios:clear`). `metro.config.js` also keys `cacheVersion` to the project path to reduce stale-bundle issues.
- If the iOS simulator fails with *Invalid device or device pair*, pick a device in **Simulator → File → Open Simulator** or reset `CurrentDeviceUDID` in Simulator preferences.
- If Expo Go shows *“There was a problem running the requested app”*: update **Expo Go** to the latest version, restart Metro, and confirm the terminal does **not** say `Using src/app as the root directory for Expo Router`.

---

## Configuration source of truth

| File | Purpose |
|------|---------|
| **`app.config.ts`** | App name, version, bundle IDs, icons, splash, permissions |
| **`eas.json`** | Build profiles (`development`, `preview`, `production`) |
| **`src/constants/app.ts`** | Marketing version `APP_RELEASE_VERSION` (keep in sync with `app.config.ts` `version`) |
| **`.env.example`** | Optional `APP_VARIANT` and public legal URLs |

After `eas init`, set `extra.eas.projectId` in `app.config.ts` (do not guess UUIDs).

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| *(none)* | No | Core app runs without secrets |
| `APP_VARIANT` | No | `development` \| `preview` \| `production` (EAS profiles set this) |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | No | HTTPS privacy policy for store + Settings link |
| `EXPO_PUBLIC_TERMS_URL` | No | HTTPS terms URL |
| `EXPO_PUBLIC_SUPPORT_URL` | No | Support / feedback URL |

Copy `.env.example` → `.env` locally only; **never commit** `.env`.

---

## Release gates (run before every store build)

```bash
npm ci
npm run validate:release
```

iOS-focused gate:

```bash
npm run validate:ios-release
```

---

## EAS build commands

Login once:

```bash
eas login
eas init   # links project; then add projectId to app.config.ts
```

**Production store builds:**

```bash
npm run build:ios:production
npm run build:android:production
# or
npm run build:all:production
```

`production` profile uses:

- `distribution: store`
- `autoIncrement: true` (native build numbers)
- `APP_VARIANT=production`

**Internal testing:**

```bash
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

**Dev client:**

```bash
eas build --platform ios --profile development
```

---

## Submit to stores

After a successful production build:

```bash
npm run submit:ios
npm run submit:android
```

Configure App Store Connect API key / Play service account in EAS credentials (`eas credentials`).

---

## Versioning checklist (each release)

1. Bump `version` in **`app.config.ts`**, **`package.json`**, and **`APP_RELEASE_VERSION`** in `src/constants/app.ts`.
2. Let EAS **`autoIncrement`** bump `ios.buildNumber` / `android.versionCode`, or increment manually in `app.config.ts` if not using EAS.
3. Run `npm run validate:release`.
4. Complete physical-device QA per [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md).

---

## Icons & splash

| Asset | Path | Store note |
|-------|------|------------|
| App icon | `assets/images/icon.png` | Replace with final **1024×1024** before marketing launch |
| Adaptive foreground | `assets/images/adaptive-icon.png` | Android adaptive icon |
| Splash | `assets/images/splash-icon.png` | Native splash |

Current icons are **placeholders** duplicated from splash — acceptable for internal TestFlight, **not** final App Store creative.

---

## Permissions (foundation release)

| Platform | Declared | Used |
|----------|----------|------|
| iOS | None beyond defaults | No camera, photos, location, mic, notifications |
| Android | `permissions: []` | No optional dangerous permissions |

Reminders use **in-app** time cues only — no `expo-notifications`.

---

## Authentication & accounts

**Optional.** Kairo works fully offline without an account. When `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set at build time:

- Users may sign in via Settings → **Account** (Apple, Google, or email)
- Session tokens persist in **Expo SecureStore**
- Journal data syncs to **Supabase Postgres** with RLS

Setup: [`SUPABASE.md`](./SUPABASE.md). Apply schema from `supabase/migrations/` before enabling auth in production.

**Data deletion (store compliance):**

- **Local only:** Settings → **Clear All Data**
- **Cloud account:** Settings → Account → **Delete account** (RPC `delete_own_account`)

---

## Legal URLs for App Store Connect

Default in-app links point to GitHub-hosted `docs/PRIVACY.md` and `docs/TERMS.md`.  

Before public launch, host copies at stable HTTPS URLs and set:

```bash
EXPO_PUBLIC_PRIVACY_POLICY_URL=https://your-domain.com/privacy
EXPO_PUBLIC_TERMS_URL=https://your-domain.com/terms
EXPO_PUBLIC_SUPPORT_URL=https://your-domain.com/support
```

---

## Signing

- **iOS:** EAS manages certificates / provisioning with your Apple team (configure via `eas credentials`).
- **Android:** EAS generates or uses your upload keystore (`eas credentials`).

Never commit `.p12`, keystores, or App Store Connect API keys.

---

## Deep links

URL scheme: **`kairo://`** (see `scheme` in `app.config.ts`). No universal links configured in the foundation slice.

---

## CI alignment

GitHub Actions runs `npm run validate:release` on `main` — see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

---

## Related docs

- [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) — device QA matrix  
- [`APP_STORE_READINESS.md`](./APP_STORE_READINESS.md) — polish + Connect answers  
- [`SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md) — logging and secrets  
- [`PRIVACY.md`](./PRIVACY.md) / [`TERMS.md`](./TERMS.md) — policy text  
