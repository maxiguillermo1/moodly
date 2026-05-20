# Web deployment — logical work chunks

Kairo is **optimized for native (iOS first)**. **`npm run web`** is supported via Expo, but **web is not the primary product** until you deliberately invest in it. Use this doc to sequence web work without blocking mobile release.

---

## Chunk 1 — Baseline smoke

- Run **`npm run web`** locally; fix **Platform** assumptions (safe area, haptics, blur fallbacks) only where they break the page.
- Confirm **AsyncStorage** behaves in the browser (Expo’s web implementation); smoke **Today → save → reload**.

## Chunk 2 — Static export sanity

- Run **`npx expo export -p web`** (optionally with **`--output-dir`**); ensure Metro completes without errors.
- Add a **CI job or npm script** (e.g. `export:web-check`) when web becomes a supported surface — today CI validates **iOS + Android** bundles via **`npm run export:bundles-check`** only.

## Chunk 3 — Hosting model

- Choose host (**static CDN**, **single-page** friendly): configure **rewrites** so client-side routes load `index.html` (React Navigation on web often needs this if URLs are used).
- If you stay on **client-only** routing without deep links, simplest hosting still works; document the choice.

## Chunk 4 — Privacy & storage story

- **Local-first** on web still means **browser storage** (not sync across devices). Update any **privacy label / FAQ** if you market web separately from iOS.
- No change to **logger contract**; keep **metadata-only** logs.

## Chunk 5 — Design & accessibility

- Re-verify **tap targets**, **keyboard** focus order, and **motion** (reduce motion) where web differs from iOS.
- **`LiquidGlass` / blur**: confirm acceptable fallback (opaque vs blur) on browsers without backdrop-filter support.

## Chunk 6 — Optional PWA

- If you want **installability** / **offline**: evaluate **Expo web PWA** options and **service worker** implications (cache invalidation on deploy).

## Chunk 7 — Release pipeline

- Mirror native discipline: **version** in `app.json` / `package.json`, **no dev-only seeds** in production builds, **`installSafeConsole`** stays at **`App.tsx`** entry.
- **EAS** workflows today target **native** (`eas.json`); web may use separate **static deploy** (GitHub Actions → S3/Cloudflare/etc.) when ready.

---

## References

| Topic | Doc |
|--------|-----|
| Native release checklist | [`docs/APP_STORE_READINESS.md`](./APP_STORE_READINESS.md) |
| Testing & CI commands | [`docs/TESTING.md`](./TESTING.md) |
| Architecture / boundaries | [`docs/architecture.md`](./architecture.md) |
