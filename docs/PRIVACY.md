# Kairo Privacy Policy

**Last updated:** 2026-05-19  
**Applies to:** Kairo mobile app (iOS / Android), version 0.6.x and later unless superseded.

## Summary

Kairo is **local-first**. Your mood entries, journal notes, habits, goals, and reminders are stored **on your device** unless you explicitly export or back them up using tools outside the app (for example, an OS-level device backup).

Kairo **does not**:

- Require an account or login for core use
- Operate a Kairo-owned cloud backend for your journal content
- Sell your data or use third-party advertising SDKs in the foundation product
- Schedule push notifications or read your contacts, photos, location, or microphone (foundation release)

## Data we process

| Data | Where it lives | Purpose |
|------|----------------|---------|
| Mood grades, notes, goals, habits, reminders | On-device storage (AsyncStorage) | Core app functionality |
| Appearance and extension toggles | On-device settings | Your preferences |

We do not receive this content on Kairo servers because **there is no Kairo server** for core journaling in the current product.

## Data we do not collect

- No account email or password (no accounts)
- No analytics identifiers shipped for ads
- No crash reporting SDK in the open-source foundation slice (verify your release build before store submission)

## Your choices

- **Delete all data:** Settings → **Clear All Data** permanently removes local mood, habit, goal, and reminder data from this app’s storage (settings may remain until you clear app storage or reinstall).
- **Uninstall:** Removing the app deletes local app storage subject to platform behavior.
- **Device backup:** iOS iCloud / Android backup may copy app data according to OS rules — that is outside Kairo’s control.

## Children

Kairo is not directed at children under 13. Do not use the app if you are under the age required by your jurisdiction without guardian consent.

## Changes

We may update this policy when the product changes (for example, if cloud sync is added with explicit consent). The in-app version string and repository changelog document engineering releases.

## Contact

Open a GitHub issue on the Kairo repository or use the **Support** link in Settings (when configured for your build).

**Note for maintainers:** Host this document at a stable HTTPS URL for App Store Connect and Google Play “Privacy policy” fields before submission.
