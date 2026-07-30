# Toolchain baseline

Recorded: 2026-07-30 (branch `chore/ios-production-hardening-20260730`)

## Host

| Item | Value |
|------|-------|
| macOS | 26.2 (Build 25C56) |
| Xcode | 16.4 (16F6) |
| Node | v22.22.3 |
| npm | 10.9.8 |
| Expo CLI | 54.0.26 |

## Disk (preflight)

| Path | Size |
|------|------|
| Free on `/` | ~41 GiB |
| DerivedData | ~2.2 GiB |
| CoreSimulator | ~2.5 GiB |
| ~/.npm | ~4.0 GiB |
| ~/.expo | ~1.1 GiB |
| `node_modules` | ~468 MiB |

## Application (`package.json`)

| Package | Version |
|---------|---------|
| kairo (app) | 0.6.0 |
| expo | ~54.0.36 |
| react | 19.1.0 |
| react-native | 0.81.5 |
| @react-navigation/native | ^7.0.0 |
| @react-navigation/bottom-tabs | ^7.0.0 |
| @react-navigation/native-stack | ^7.0.0 |
| react-native-screens | 4.16.0 |
| react-native-gesture-handler | ~2.28.0 |
| react-native-reanimated | 4.1.1 |
| react-native-safe-area-context | 5.6.0 |
| @shopify/flash-list | 2.0.2 |
| @supabase/supabase-js | 2.105.4 |
| @react-native-async-storage/async-storage | 2.2.0 |
| expo-secure-store | ~15.0.8 |
| jest | ^29.7.0 |
| typescript | ^5.3.0 |

## EAS profiles (`eas.json`)

- `development` — dev client, internal, simulator iOS
- `preview` — internal distribution
- `production` — App Store, auto-increment build number

## Hermes / New Architecture

Verify on each release build:

```bash
# Metro log after launch (dev with probe):
# perf.deviceInfo includes hermes: true|false

npm run export:ios-check
```

Do not assume Hermes from config alone — confirm in runtime `perf.deviceInfo` or native logs.

## Re-baseline

After dependency upgrades, re-run:

```bash
sw_vers && xcodebuild -version && node --version && npx expo --version
npm ls expo react react-native @react-navigation/native --depth=0
```

Update this file with new values.
