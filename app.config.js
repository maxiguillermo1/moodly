/**
 * Expo config (source of truth for native identifiers, icons, and EAS builds).
 * JavaScript source — supports release channels via `APP_VARIANT`.
 *
 * @see docs/DEPLOYMENT.md
 */
const APP_VARIANT = process.env.APP_VARIANT ?? 'production';
const IS_DEV_CLIENT = APP_VARIANT === 'development';
const config = {
    name: IS_DEV_CLIENT ? 'Kairo (Dev)' : 'Kairo',
    slug: 'kairo',
    version: '0.6.0',
    /** Must match the Expo SDK in package.json so Expo Go accepts the QR manifest. */
    sdkVersion: '54.0.0',
    scheme: 'kairo',
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
        'expo-secure-store',
        'expo-web-browser',
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
        bundleIdentifier: 'com.maxiguillermo.kairo',
        buildNumber: '1',
        supportsTablet: true,
        usesAppleSignIn: true,
        infoPlist: {
            CFBundleDisplayName: IS_DEV_CLIENT ? 'Kairo Dev' : 'Kairo',
            ITSAppUsesNonExemptEncryption: false,
        },
        config: {
            usesNonExemptEncryption: false,
        },
    },
    android: {
        package: 'com.maxiguillermo.kairo',
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
            projectId: 'c85f5eeb-f78c-42d4-81b5-bb72a6774809',
        },
    },
};
export default config;
