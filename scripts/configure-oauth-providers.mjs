#!/usr/bin/env node
/**
 * Enable Apple / Google auth providers on linked Supabase project via Management API.
 *
 * Required env (in .env, not committed):
 *   SUPABASE_ACCESS_TOKEN — https://supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF  — e.g. zmdmfjneqxrromayqhzw
 *
 * Google:
 *   GOOGLE_OAUTH_CLIENT_ID     — Web client ID first; comma-separate iOS/Android IDs
 *   GOOGLE_OAUTH_CLIENT_SECRET — Web client secret
 *
 * Apple (native iOS — register bundle IDs in Client IDs):
 *   APPLE_AUTH_CLIENT_IDS — comma-separated, e.g. com.maxiguillermo.kairo,host.exp.Exponent
 *
 * Apple (OAuth for Android — optional):
 *   APPLE_AUTH_SERVICES_ID — Services ID
 *   APPLE_AUTH_SECRET      — generated JWT secret (rotate every 6 months)
 *
 * Usage: npm run configure:oauth
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnvFile(name) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile('.env');

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() ?? 'zmdmfjneqxrromayqhzw';

const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
const googleSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
const appleClientIds = process.env.APPLE_AUTH_CLIENT_IDS?.trim();
const appleServicesId = process.env.APPLE_AUTH_SERVICES_ID?.trim();
const appleSecret = process.env.APPLE_AUTH_SECRET?.trim();

async function patchAuthConfig(body) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Auth config PATCH failed (${res.status}): ${text}`);
  }
  return text;
}

async function main() {
  if (!token) {
    console.error('Missing SUPABASE_ACCESS_TOKEN in .env');
    console.error('Create one at https://supabase.com/dashboard/account/tokens');
    process.exit(1);
  }

  const patch = {};
  let changed = false;

  if (googleClientId && googleSecret) {
    patch.external_google_enabled = true;
    patch.external_google_client_id = googleClientId;
    patch.external_google_secret = googleSecret;
    patch.external_google_skip_nonce_check = true;
    changed = true;
    console.log('→ Enabling Google OAuth');
  } else {
    console.log('⊘ Skipping Google (set GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET)');
  }

  if (appleClientIds || (appleServicesId && appleSecret)) {
    patch.external_apple_enabled = true;
    if (appleClientIds) patch.external_apple_client_id = appleClientIds;
    if (appleSecret) patch.external_apple_secret = appleSecret;
    changed = true;
    console.log('→ Enabling Apple Sign In');
  } else {
    console.log('⊘ Skipping Apple (set APPLE_AUTH_CLIENT_IDS for native iOS, or Services ID + secret for OAuth)');
  }

  if (!changed) {
    console.log('\nNo OAuth credentials found. Add vars to .env — see docs/SUPABASE.md § Apple / Google setup.');
    process.exit(0);
  }

  await patchAuthConfig(patch);
  console.log('\nOAuth providers updated.');
  if (patch.external_apple_enabled) {
    console.log(`  Apple client IDs: ${patch.external_apple_client_id ?? '(Services ID only)'}`);
    if (!patch.external_apple_secret) {
      console.log('  Apple native iOS: ready (no secret required for signInWithIdToken)');
    }
  }
  if (patch.external_google_enabled) {
    console.log('  Google: enabled (skip nonce check for mobile)');
  }
  console.log('Verify with: npm run verify:supabase');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
