# Kairo Privacy Policy

**Last updated:** 2026-05-20  
**Applies to:** Kairo mobile app (iOS / Android), version 0.6.x and later unless superseded.

## Summary

Kairo is **local-first**. Your mood entries, journal notes, habits, goals, and reminders are stored **on your device** by default.

**Optional cloud sync:** If you sign in (Settings → Account), your journal data is stored in **your Supabase project** (Postgres with row-level security). Sign-out clears the local cache on this device; cloud data remains until you delete your account.

Kairo **does not**:

- Require an account for core journaling
- Sell your data or use third-party advertising SDKs in the foundation product
- Schedule push notifications or read your contacts, photos, location, or microphone (foundation release)

## Data we process

| Data | Where it lives | Purpose |
|------|----------------|---------|
| Mood grades, notes, goals, habits, reminders | On-device storage (SQLite + AsyncStorage) | Core app functionality |
| Appearance and extension toggles | On-device settings | Your preferences |
| Same domains (when signed in) | Supabase Postgres in your configured project | Cloud backup & multi-device sync |

When cloud sync is enabled, journal content transits over TLS to Supabase. The app uses the public anon/publishable key with **row-level security** — users cannot access other accounts' data.

## Data we do not collect

- No analytics identifiers shipped for ads
- No crash reporting SDK in the open-source foundation slice (verify your release build before store submission)
- No Kairo-operated ad network or data broker

## Your choices

- **Delete all data (local):** Settings → **Clear All Data** permanently removes local mood, habit, goal, and reminder data from this app’s storage (settings may remain until you clear app storage or reinstall).
- **Sign out:** Clears local journal cache on this device; cloud copy preserved if you were signed in.
- **Delete account:** Settings → Account → **Delete account** removes your Supabase auth user and all cloud rows (when cloud sync is configured).
- **Uninstall:** Removing the app deletes local app storage subject to platform behavior.
- **Device backup:** iOS iCloud / Android backup may copy app data according to OS rules — that is outside Kairo’s control.

## Children

Kairo is not directed at children under 13. Do not use the app if you are under the age required by your jurisdiction without guardian consent.

## Changes

We may update this policy when the product changes. The in-app version string and repository changelog document engineering releases.

## Contact

Open a GitHub issue on the Kairo repository or use the **Support** link in Settings (when configured for your build).

**Note for maintainers:** Host this document at a stable HTTPS URL for App Store Connect and Google Play “Privacy policy” fields before submission.
