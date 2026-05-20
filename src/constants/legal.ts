/**
 * @fileoverview Legal / support URLs for store compliance (opened via system browser).
 * Override at build time with `EXPO_PUBLIC_*` when hosting policies on your domain.
 * @module constants/legal
 */

const DEFAULT_REPO = 'https://github.com/maxiguillermo1/moodly';

function envUrl(key: string, fallback: string): string {
  const v = process.env[key];
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : fallback;
}

/** Public HTTPS URLs for App Store / Play privacy questionnaire. */
export const LEGAL_URLS = {
  privacyPolicy: envUrl(
    'EXPO_PUBLIC_PRIVACY_POLICY_URL',
    `${DEFAULT_REPO}/blob/main/docs/PRIVACY.md`
  ),
  termsOfUse: envUrl('EXPO_PUBLIC_TERMS_URL', `${DEFAULT_REPO}/blob/main/docs/TERMS.md`),
  support: envUrl('EXPO_PUBLIC_SUPPORT_URL', `${DEFAULT_REPO}/issues`),
} as const;
