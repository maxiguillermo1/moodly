#!/usr/bin/env node
/**
 * Verify Kairo ↔ Supabase connectivity (schema, auth, RLS, RPC).
 * Usage: node scripts/verify-supabase.mjs
 * Requires .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

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
loadEnvFile('.env.development');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

const TABLES = [
  'profiles',
  'mood_entries',
  'habit_selections',
  'goals',
  'goal_progress',
  'app_settings',
  'tracked_habits',
  'tasks_records',
  'task_day_items',
  'insights_reflection_timing',
];

let failed = 0;

function pass(msg) {
  console.log(`✓ ${msg}`);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  failed += 1;
}

async function main() {
  console.log('Kairo Supabase verification\n');

  if (!url || !key) {
    fail('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }
  pass(`Env configured (${url})`);

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const table of TABLES) {
    const { error } = await client.from(table).select('*').limit(0);
    if (error) fail(`Table ${table}: ${error.message}`);
    else pass(`Table ${table} reachable`);
  }

  const { data: anonRows, error: anonErr } = await client.from('mood_entries').select('date').limit(5);
  if (anonErr) fail(`Anon mood read: ${anonErr.message}`);
  else if (Array.isArray(anonRows) && anonRows.length === 0) pass('RLS: anon session sees no mood rows');
  else fail(`RLS: expected empty anon mood rows, got ${anonRows?.length ?? '?'}`);

  const testEmail = process.env.KAIRO_SUPABASE_VERIFY_EMAIL ?? 'kairo.setup.test2+dev@gmail.com';
  const testPassword = process.env.KAIRO_SUPABASE_VERIFY_PASSWORD ?? 'KairoTestSetup2026!';

  let signIn = null;
  let signInErr = null;
  ({ data: signIn, error: signInErr } = await client.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  }));

  if (signInErr || !signIn.session) {
    const { error: signUpErr } = await client.auth.signUp({ email: testEmail, password: testPassword });
    if (!signUpErr) {
      ({ data: signIn, error: signInErr } = await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      }));
    }
  }

  if (signInErr || !signIn?.session) {
    fail(`Auth sign-in: ${signInErr?.message ?? 'no session'}`);
  } else {
    pass(`Auth sign-in (${testEmail})`);
    const authed = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: rows, error: readErr } = await authed.from('mood_entries').select('date,mood').limit(5);
    if (readErr) fail(`Authed mood read: ${readErr.message}`);
    else pass(`Authed mood read OK (${rows?.length ?? 0} rows)`);

    const { error: rpcAnonErr } = await client.rpc('delete_own_account');
    if (rpcAnonErr && /not authenticated/i.test(rpcAnonErr.message)) {
      pass('RPC delete_own_account exists (rejects unauthenticated)');
    } else if (rpcAnonErr?.code === 'PGRST202') {
      fail('RPC delete_own_account not found in schema');
    } else {
      pass('RPC delete_own_account registered');
    }
  }

  try {
    const settingsRes = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (settingsRes.ok) {
      const settings = await settingsRes.json();
      const apple = Boolean(settings.external?.apple);
      const google = Boolean(settings.external?.google);
      if (apple) pass('Apple Sign In enabled (native iOS via signInWithIdToken)');
      else console.log('○ Apple Sign In not enabled (run npm run configure:oauth or Dashboard)');
      if (google) pass('Google Sign In enabled');
      else console.log('○ Google Sign In not enabled (run npm run configure:oauth or Dashboard)');
    }
  } catch {
    console.log('○ Could not read auth provider settings');
  }

  try {
    const authorizeUrl = `${url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent('kairo://auth/callback')}`;
    const res = await fetch(authorizeUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: { apikey: key },
    });
    const location = res.headers.get('location') ?? '';
    if (res.status === 302 && location.includes('accounts.google.com') && location.includes('client_id=')) {
      pass('Google OAuth authorize redirects to Google');
    } else {
      fail(`Google OAuth authorize: expected 302 to Google, got ${res.status} location=${location.slice(0, 80)}`);
    }
  } catch (e) {
    fail(`Google OAuth authorize: ${e instanceof Error ? e.message : 'request failed'}`);
  }

  console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
