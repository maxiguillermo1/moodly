# Kairo — Supabase cloud architecture

**Status:** Implemented (v1.x). Supabase Postgres is the **cloud source of truth** when the user is signed in. Local SQLite + AsyncStorage remain a **cache** for fast UI, offline viewing, and pending sync.

## Quick setup

1. Create a [Supabase](https://supabase.com) project.
2. Apply schema: `supabase/migrations/20260520100000_kairo_cloud_schema.sql` (Supabase SQL editor or CLI `supabase db push`).
3. Enable Auth providers in Supabase Dashboard → Authentication → Providers:
   - **Email** (password)
   - **Apple** (iOS — configure Services ID + redirect `kairo://auth/callback`)
   - **Google** (OAuth client + redirect `kairo://auth/callback`)
4. Set env (copy from `.env.example`):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

**CLI workflow (recommended for this repo):**

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push          # applies supabase/migrations/
npx supabase config push      # auth redirect kairo://auth/callback, email signup
```

Auth redirect and email settings live in [`supabase/config.toml`](../supabase/config.toml).

**EAS builds:** set the same two `EXPO_PUBLIC_*` vars via `eas env:create` for `production`, `preview`, and `development` (project `@habibeatsteam/kairo`).

**Cursor MCP (optional):** project-scoped Supabase MCP is configured in [`.cursor/mcp.json`](../.cursor/mcp.json). On first use, Cursor prompts Supabase OAuth (Settings → Tools & MCP). Scoped to `zmdmfjneqxrromayqhzw` only.

5. Rebuild native app after adding `expo-apple-authentication` (EAS / dev client).

Without these env vars, Kairo runs **local-only** (existing behavior).

## Architecture

```
UI (screens/hooks)
  → src/storage (unchanged façade)
  → src/data/storage/* (local cache — SQLite + AsyncStorage)
  → src/data/sync/syncBridge (after local persist)
  → src/cloud/sync (outbox → push / pull)
  → Supabase Postgres (RLS per user)
```

| Layer | Role |
|-------|------|
| **Supabase Auth** | Session in SecureStore; Apple / Google / email |
| **Postgres + RLS** | Private journal rows per `auth.uid()` |
| **Local cache** | Instant UI; offline reads; outbox for writes |
| **Sync engine** | Pull on login/launch; push outbox; retry on failure |

## Postgres schema

See `supabase/migrations/20260520100000_kairo_cloud_schema.sql`.

| Table | Contents |
|-------|----------|
| `profiles` | User profile (auto-created on signup) |
| `mood_entries` | One row per local calendar day (mood + note) |
| `habit_selections` | `(date, habit_id)` marks |
| `goals` + `goal_progress` | Goal metadata + daily progress |
| `app_settings` | `AppSettings` JSON |
| `tracked_habits` | Habit strip config |
| `tasks_records` + `task_day_items` | Reminders metadata + day shards |
| `insights_reflection_timing` | Insight cooldown bookkeeping |

**RLS:** every table uses `auth.uid() = user_id` policies — users cannot read or write other accounts’ data.

## Auth flows

| Method | Implementation |
|--------|----------------|
| Email/password | `signInWithPassword` / `signUp` |
| Sign in with Apple | `expo-apple-authentication` → `signInWithIdToken` |
| Sign in with Google | OAuth via `expo-web-browser` + `exchangeCodeForSession` |

**Session:** persisted in **Expo SecureStore** via Supabase auth storage adapter.

**UI:** Settings → **Account** (`AccountScreen`).

## Sync behavior

### Write path (signed in)

1. User saves mood/journal → local SQLite row (instant UI).
2. `syncBridge` enqueues operation in AsyncStorage outbox (`kairo.sync.outbox`).
3. Background push to Supabase (debounced ~400ms).
4. Status: `syncing` → `saved` / `offline` (Settings + Account).

**Domains wired to `syncBridge` (incremental push after local persist):** mood/journal, habit selections, tracked habits, goals, settings, reminders/tasks (metadata + day shards), insights reflection timing.

**First sign-in snapshot** (`cloudSnapshotEnqueue`): uploads all domains above including every reminder day shard from `dayIndex`.

### Read path / recovery

1. App launch or sign-in → `pullCloudDataToLocal` merges cloud into local cache.
2. **Conflict policy:** per mood row, higher `updated_at_ms` wins.
3. Reinstall / new device → sign in → full cloud restore.
4. First sign-in on device with existing local data → full local snapshot enqueued, then merge + push.

### Sign out

- Supabase session cleared; **local journal cache wiped** (privacy on shared devices).
- **Cloud data preserved** in Postgres.

### Delete account

- RPC `delete_own_account()` removes `auth.users` row (cascade deletes all user tables).

## Privacy & security

- Journal text transits over TLS; stored in your Supabase project (you control region & retention).
- Anon key is public by design; **RLS** enforces row isolation.
- No service-role key in the app.
- Metadata-only logs in app (`logger`) — never note bodies.

## Code map

| Path | Purpose |
|------|---------|
| `src/cloud/config.ts` | Env + redirect URI |
| `src/cloud/supabase/client.ts` | Supabase singleton |
| `src/cloud/auth/` | Auth service + `AuthProvider` |
| `src/cloud/sync/` | Outbox, push, pull, engine, status |
| `src/data/sync/syncBridge.ts` | Storage → outbox hooks |
| `src/data/sync/cloudPullApplier.ts` | Pull → local storage |
| `src/features/account/screens/AccountScreen.tsx` | Account UI |

## Verification

After setup, run:

```bash
npm run verify:supabase
```

Checks: env vars, all 10 Kairo tables via PostgREST, RLS (anon sees no rows), email sign-in, `delete_own_account` RPC registration.

**CLI checks:**

```bash
npx supabase migration list --linked   # local === remote
npx supabase inspect db table-stats --linked
```

**Cursor MCP:** [`.cursor/mcp.json`](../.cursor/mcp.json) — complete OAuth in Settings → Tools & MCP if tools are missing.

## Apple & Google sign-in

App code is wired (`authService.ts`, `AccountAuthForm`). Providers must be enabled in Supabase with OAuth credentials.

Redirect URI for all OAuth: **`kairo://auth/callback`** (matches `app.config.ts` `scheme`).

### Google

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create **Web application** OAuth client:
   - Authorized redirect URI: `https://zmdmfjneqxrromayqhzw.supabase.co/auth/v1/callback`
3. (Optional) Create **iOS** client with bundle ID `com.maxiguillermo.kairo`.
4. Supabase Dashboard → Auth → Google → enable, paste Web client ID + secret.
   - Client IDs field: `WEB_ID,IOS_ID` (Web first). Enable **Skip nonce check** for mobile.
5. Or add to `.env` and run `npm run configure:oauth` (see `.env.example`).

### Apple

**iOS (native — recommended):**

1. Apple Developer → Identifiers → App ID `com.maxiguillermo.kairo` → enable **Sign in with Apple**.
2. Supabase Dashboard → Auth → Apple → enable.
3. **Client IDs:** `com.maxiguillermo.kairo` (+ `host.exp.Exponent` for Expo Go testing).
4. No OAuth secret needed for native-only iOS (`signInWithIdToken` via `expo-apple-authentication`).
5. `app.config.ts` sets `ios.usesAppleSignIn: true`.

**Android (OAuth fallback):**

Uses browser OAuth when Apple provider is enabled. Requires Apple Services ID + secret in Supabase (same as web OAuth setup).

### Verify providers

```bash
npm run verify:supabase   # reports Apple/Google enabled status
npm run configure:oauth   # push credentials from .env via Management API
```

UI only shows Apple/Google buttons when the provider is enabled on your Supabase project (`/auth/v1/settings`).

## Auth providers status

| Provider | App support | Supabase config |
|----------|-------------|-----------------|
| **Email** | Ready | Enabled via `supabase/config.toml` |
| **Apple** | iOS native + Android OAuth | **Enabled** — `com.maxiguillermo.kairo`, `host.exp.Exponent` (run `npm run configure:oauth`) |
| **Google** | OAuth (all platforms) | Web client ID + secret in Dashboard |

## Testing

```bash
npm test                    # unit tests (outbox, existing storage)
npm run validate            # typecheck + lint + test
```

Configure test env with mock Supabase client in future CI jobs; storage tests remain local-only.

## App Store notes

- Declare account creation and cloud storage in App Privacy questionnaire.
- Update hosted `docs/PRIVACY.md` before release.
- Apple Sign In required if other third-party sign-in is offered.

See also: [`CLOUD_BACKUP_DESIGN.md`](./CLOUD_BACKUP_DESIGN.md), [`DATA_ARCHITECTURE.md`](./DATA_ARCHITECTURE.md), [`DEPLOYMENT.md`](./DEPLOYMENT.md).
