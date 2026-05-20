/**
 * Expo config (source of truth for native identifiers, icons, and EAS builds).
 * Replaces static `app.json` to support release channels via `APP_VARIANT`.
 *
 * @see docs/DEPLOYMENT.md
 */
import type { ExpoConfig } from 'expo/config';

const APP_VARIANT = process.env.APP_VARIANT ?? 'production';
const IS_DEV_CLIENT = APP_VARIANT === 'development';

const config: ExpoConfig = {
  name: IS_DEV_CLIENT ? 'Moodly (Dev)' : 'Moodly',
  slug: 'moodly',
  version: '0.6.0',
  /** Must match the Expo SDK in package.json so Expo Go accepts the QR manifest. */
  sdkVersion: '54.0.0',
  scheme: 'moodly',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/images/icon.png',
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#F2F2F7',
    dark: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
  },
  plugins: [
    'expo-sqlite',
    'expo-apple-authentication',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#F2F2F7',
        dark: {
          image: './assets/images/splash-icon.png',
          backgroundColor: '#000000',
          resizeMode: 'contain',
        },
        imageWidth: 200,
      },
    ],
  ],
  ios: {
    bundleIdentifier: 'com.moodly.app',
    buildNumber: '1',
    supportsTablet: true,
    infoPlist: {
      CFBundleDisplayName: IS_DEV_CLIENT ? 'Moodly Dev' : 'Moodly',
      ITSAppUsesNonExemptEncryption: false,
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.moodly.app',
    versionCode: 1,
    permissions: [],
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#F2F2F7',
    },
  },
  extra: {
    appVariant: APP_VARIANT,
    eas: {
      // Set after `eas init` — do not commit guessed UUIDs.
      // projectId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    },
  },
};

export default config;
